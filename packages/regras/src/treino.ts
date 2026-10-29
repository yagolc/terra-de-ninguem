import { BALANCEAMENTO } from './balanceamento.ts';
import { habitantesLivres } from './producao.ts';
import type { EstadoCidade, LoteTreino, Recursos, TipoUnidade, Verificacao } from './tipos.ts';
import { mapearRecursos, temRecursos } from './util.ts';

export function custoTreino(tipo: TipoUnidade, quantidade: number): Recursos {
  const { custo } = BALANCEAMENTO.unidades[tipo];
  return mapearRecursos((r) => custo[r] * quantidade);
}

/** Tempo para treinar o lote inteiro, em ms. Quartéis de nível mais alto treinam mais rápido. */
export function tempoTreinoMs(tipo: TipoUnidade, quantidade: number, nivelQuartel: number): number {
  const { reducaoPorNivelQuartel, reducaoMaxima } = BALANCEAMENTO.treino;
  const reducao = Math.min(reducaoMaxima, reducaoPorNivelQuartel * Math.max(0, nivelQuartel - 1));
  const segundos = BALANCEAMENTO.unidades[tipo].tempoTreinoSeg * quantidade * (1 - reducao);
  return Math.round(segundos) * 1000;
}

/** Soldados para a conta da população: tropas do jogador mais as que estão na fila de treino. */
export function soldadosNaConta(tropas: number, fila: readonly LoteTreino[]): number {
  return tropas + fila.reduce((soma, lote) => soma + lote.quantidade, 0);
}

export type MotivoRecusaTreino =
  | 'quantidade_invalida'
  | 'fila_cheia'
  | 'sem_quartel'
  | 'recursos_insuficientes'
  | 'populacao_insuficiente';

/**
 * Confere se a cidade pode treinar o lote: precisa de quartel, vaga na fila, recursos e habitantes
 * livres. O lote começa quando o último da fila terminar.
 */
export function verificarTreino(entrada: {
  cidade: EstadoCidade;
  tipo: TipoUnidade;
  quantidade: number;
  /** Soldados do jogador, incluindo os que já estão em treino (`soldadosNaConta`). */
  soldados: number;
  fila: readonly LoteTreino[];
  agora: number;
}): Verificacao<{ custo: Recursos; tempoMs: number; prontoEm: number }, MotivoRecusaTreino> {
  const { cidade, tipo, quantidade, soldados, fila, agora } = entrada;

  if (!Number.isInteger(quantidade) || quantidade < 1) return { ok: false, motivo: 'quantidade_invalida' };
  if (cidade.predios.quartel < 1) return { ok: false, motivo: 'sem_quartel' };
  if (fila.length >= BALANCEAMENTO.treino.maxLotesNaFila) return { ok: false, motivo: 'fila_cheia' };

  const custo = custoTreino(tipo, quantidade);
  if (!temRecursos(cidade.recursos, custo)) return { ok: false, motivo: 'recursos_insuficientes' };
  if (habitantesLivres(cidade, soldados) < quantidade) return { ok: false, motivo: 'populacao_insuficiente' };

  const tempoMs = tempoTreinoMs(tipo, quantidade, cidade.predios.quartel);
  const inicio = Math.max(agora, ...fila.map((lote) => lote.prontoEm));
  return { ok: true, custo, tempoMs, prontoEm: inicio + tempoMs };
}
