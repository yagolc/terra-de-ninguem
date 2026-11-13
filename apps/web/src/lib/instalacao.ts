import { useEffect, useState } from 'react';

/** Evento do Chrome/Edge/Android que permite abrir a janela de instalação do app quando o jogador pedir. */
type PedidoDeInstalacao = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

// O navegador manda o evento logo ao carregar, antes de a tela aparecer: guarda aqui para o botão usar depois.
let pedido: PedidoDeInstalacao | null = null;
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((f) => f());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    pedido = e as PedidoDeInstalacao;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    pedido = null;
    avisar();
  });
}

/** O jogo já está aberto como app (ícone da tela inicial), e não numa aba do navegador. */
export function abertoComoApp(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** iPhone ou iPad: o Safari não tem botão de instalar, só "Compartilhar → Adicionar à Tela de Início". */
function ehIos(): boolean {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/**
 * Como o jogador pode instalar o jogo aqui: `botao` (o navegador abre a janela de instalação), `ios` (só pelo menu
 * Compartilhar) ou `nenhum` (já instalado ou navegador sem instalação).
 */
export function useInstalacao() {
  const [, setVersao] = useState(0);
  useEffect(() => {
    const f = () => setVersao((v) => v + 1);
    ouvintes.add(f);
    return () => {
      ouvintes.delete(f);
    };
  }, []);

  const modo: 'botao' | 'ios' | 'nenhum' = abertoComoApp() ? 'nenhum' : pedido ? 'botao' : ehIos() ? 'ios' : 'nenhum';

  async function instalar(): Promise<boolean> {
    if (!pedido) return false;
    const atual = pedido;
    await atual.prompt();
    const { outcome } = await atual.userChoice;
    // O evento só serve uma vez; se o jogador recusar, o navegador manda outro mais tarde.
    pedido = null;
    avisar();
    return outcome === 'accepted';
  }

  return { modo, instalar };
}
