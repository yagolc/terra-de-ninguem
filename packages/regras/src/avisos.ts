// Avisos no celular (notificações push): os tipos que o jogador escolhe receber e a validação da inscrição de um
// aparelho. O envio fica no servidor (supabase/functions/_compartilhado/avisos.ts).

/**
 * `ataque`: a torre viu tropas ou batedor vindo; `batalha`: um ataque seu ou contra você terminou; `carta`: chegou
 * carta ou resposta a proposta; `horda`: horda bárbara vindo ou que atacou; `objetivo`: alguém cumpriu o objetivo.
 */
export const TIPOS_AVISO = ['ataque', 'batalha', 'carta', 'horda', 'objetivo'] as const;
export type TipoAviso = (typeof TIPOS_AVISO)[number];

export type MotivoRecusaInscricao = 'inscricao_invalida' | 'sem_tipos';

const TAMANHO_MAXIMO_ENDPOINT = 1000;
const TAMANHO_MAXIMO_CHAVE = 200;
const BASE64URL = /^[A-Za-z0-9_-]+=*$/;

/**
 * Confere a inscrição de um aparelho (a `PushSubscription` do navegador, em JSON) e os tipos de aviso escolhidos:
 * endereço https do serviço de push, as duas chaves em base64url e pelo menos um tipo conhecido (sem repetir).
 */
export function verificarInscricaoAvisos(entrada: { inscricao: unknown; tipos: unknown }):
  | { ok: true; endpoint: string; p256dh: string; auth: string; tipos: TipoAviso[] }
  | { ok: false; motivo: MotivoRecusaInscricao } {
  const i = entrada.inscricao as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const endpoint = i?.endpoint;
  const p256dh = i?.keys?.p256dh;
  const auth = i?.keys?.auth;
  const chaveValida = (c: unknown): c is string => typeof c === 'string' && c.length > 0 && c.length <= TAMANHO_MAXIMO_CHAVE && BASE64URL.test(c);
  if (
    typeof endpoint !== 'string' ||
    !endpoint.startsWith('https://') ||
    endpoint.length > TAMANHO_MAXIMO_ENDPOINT ||
    !chaveValida(p256dh) ||
    !chaveValida(auth)
  ) {
    return { ok: false, motivo: 'inscricao_invalida' };
  }
  const tipos = Array.isArray(entrada.tipos) ? TIPOS_AVISO.filter((t) => (entrada.tipos as unknown[]).includes(t)) : [];
  if (tipos.length === 0) return { ok: false, motivo: 'sem_tipos' };
  return { ok: true, endpoint, p256dh, auth, tipos };
}
