import type { TipoAviso } from '@terra/regras';
import { chamarFuncao } from './funcoes';
import { abertoComoApp } from './instalacao';
import { supabase } from './supabase';

/** Chave pública VAPID dos avisos (a privada fica só nos segredos das Edge Functions). */
const CHAVE_PUBLICA = 'BMzyND6WvNIn3RDlPrCdkz0TrNkrejR8OSoE3ehsbsBIIUi_ImTeZTqJQuNs2Ru2mp6KtSwcng-nvkOtbc8HMNA';

/**
 * O que este aparelho permite: `sim`; `instalar_iphone` (no iPhone, só com o jogo na tela inicial); `sem_app` (o
 * service worker não está rodando, como no `npm run dev`); `nao` (navegador sem notificações).
 */
export type SuporteAvisos = 'sim' | 'instalar_iphone' | 'sem_app' | 'nao';

export type EstadoAvisos = {
  suporte: SuporteAvisos;
  permissao: NotificationPermission | null;
  /** Inscrição deste aparelho no servidor (tipos escolhidos), ou null se os avisos estão desligados aqui. */
  tipos: TipoAviso[] | null;
};

function ehIos() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return (await navigator.serviceWorker.getRegistration()) ?? null;
}

/** Chave base64url para o formato que o `pushManager.subscribe` aceita. */
function chaveEmBytes(base64: string): Uint8Array<ArrayBuffer> {
  const texto = atob((base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

export async function lerEstadoAvisos(): Promise<EstadoAvisos> {
  const temPush = 'PushManager' in window && 'Notification' in window;
  if (!temPush) return { suporte: ehIos() && !abertoComoApp() ? 'instalar_iphone' : 'nao', permissao: null, tipos: null };
  const reg = await registro();
  if (!reg) return { suporte: 'sem_app', permissao: Notification.permission, tipos: null };
  const inscricao = await reg.pushManager.getSubscription();
  let tipos: TipoAviso[] | null = null;
  if (inscricao && supabase) {
    // O RLS só devolve as inscrições do próprio jogador.
    const { data } = await supabase
      .from('inscricoes_avisos')
      .select('tipos')
      .eq('endpoint', inscricao.endpoint)
      .maybeSingle<{ tipos: TipoAviso[] }>();
    tipos = data?.tipos ?? null;
  }
  return { suporte: 'sim', permissao: Notification.permission, tipos };
}

/** Pede a permissão (se ainda não deu), inscreve o aparelho no serviço de push e manda a inscrição ao servidor. */
export async function ativarAvisos(tipos: TipoAviso[]): Promise<void> {
  const reg = await registro();
  if (!reg) throw new Error('Os avisos só funcionam no jogo publicado.');
  const permissao = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
  if (permissao !== 'granted') throw new Error('Sem permissão de notificação, o jogo não consegue te avisar.');
  const inscricao =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: chaveEmBytes(CHAVE_PUBLICA) }));
  await chamarFuncao('cidade', { acao: 'inscrever_avisos', inscricao: inscricao.toJSON(), tipos });
}

/** Desliga os avisos neste aparelho (no servidor e no navegador). */
export async function desativarAvisos(): Promise<void> {
  const inscricao = await (await registro())?.pushManager.getSubscription();
  if (!inscricao) return;
  await chamarFuncao('cidade', { acao: 'cancelar_avisos', endpoint: inscricao.endpoint });
  await inscricao.unsubscribe();
}

/** Pede ao servidor um aviso de teste para este aparelho. */
export async function testarAvisos(): Promise<void> {
  const inscricao = await (await registro())?.pushManager.getSubscription();
  if (!inscricao) throw new Error('Os avisos não estão ligados neste aparelho.');
  await chamarFuncao('cidade', { acao: 'testar_avisos', endpoint: inscricao.endpoint });
}
