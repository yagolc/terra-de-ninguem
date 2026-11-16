import { useEffect } from 'react';
import { chamarFuncao } from './funcoes';

/** De quanto em quanto tempo, com o jogo aberto e à vista, o site avisa o servidor que o jogador está aqui. */
const INTERVALO_MS = 30 * 60 * 1000;

/**
 * Regra do ausente: abrir a partida conta como presença (todo comando também conta). Avisa ao abrir, ao voltar
 * para a aba depois de um tempo e a cada meia hora com a aba à vista. Falhar não atrapalha nada.
 */
export function usePresenca(temporadaId: string | null): void {
  useEffect(() => {
    if (!temporadaId) return;
    let ultima = 0;
    const avisar = () => {
      if (document.visibilityState !== 'visible' || Date.now() - ultima < INTERVALO_MS / 3) return;
      ultima = Date.now();
      chamarFuncao('cidade', { acao: 'presenca', temporada_id: temporadaId }).catch(() => {});
    };
    avisar();
    const relogio = window.setInterval(avisar, INTERVALO_MS);
    document.addEventListener('visibilitychange', avisar);
    return () => {
      window.clearInterval(relogio);
      document.removeEventListener('visibilitychange', avisar);
    };
  }, [temporadaId]);
}
