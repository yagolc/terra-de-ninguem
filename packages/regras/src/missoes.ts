// Missões de início: passos curtos que ensinam o jogo, cada um com uma recompensa em recursos.
// Valem a temporada toda; cada uma é resgatada uma vez, quando a condição é cumprida.
import { BALANCEAMENTO } from './balanceamento.ts';
import { capacidadeArmazem } from './predios.ts';
import { RECURSOS, type NiveisPredios, type Recursos, type Verificacao } from './tipos.ts';

/** Na ordem em que aparecem para o jogador. */
export const TIPOS_MISSAO = [
  'casa_2',
  'quartel',
  'soldados_5',
  'batedor',
  'primeiro_territorio',
  'armazem_3',
  'construcao',
  'heroi',
] as const;
export type TipoMissao = (typeof TIPOS_MISSAO)[number];

/** O que as missões conferem, montado igual pelo servidor e pelo site. */
export type SituacaoMissoes = {
  predios: NiveisPredios;
  /** Tropas do jogador, paradas e em marcha (o herói não conta). */
  soldados: number;
  /** Territórios do jogador, contando o da cidade. */
  territorios: number;
  /** Batedores já mandados na temporada (a caminho ou de volta). */
  batedores: number;
  /** Estruturas e estradas do jogador, prontas ou em obra. */
  construcoes: number;
  temHeroi: boolean;
};

export function missaoCumprida(missao: TipoMissao, s: SituacaoMissoes): boolean {
  switch (missao) {
    case 'casa_2':
      return s.predios.casa >= 2;
    case 'quartel':
      return s.predios.quartel >= 1;
    case 'soldados_5':
      return s.soldados >= 5;
    case 'batedor':
      return s.batedores >= 1;
    case 'primeiro_territorio':
      return s.territorios >= 2;
    case 'armazem_3':
      return s.predios.armazem >= 3;
    case 'construcao':
      return s.construcoes >= 1;
    case 'heroi':
      return s.temHeroi;
  }
}

export function recompensaMissao(missao: TipoMissao): Recursos {
  return { ...BALANCEAMENTO.missoes[missao] };
}

export type MotivoRecusaMissao = 'missao_desconhecida' | 'ja_resgatada' | 'nao_cumprida';

/**
 * Confere o resgate: a missão existe, ainda não foi resgatada e está cumprida. Devolve os recursos com a
 * recompensa somada, sem passar do que cabe no armazém (o que sobra se perde, como na produção).
 */
export function verificarResgateMissao(entrada: {
  missao: string;
  resgatadas: readonly string[];
  situacao: SituacaoMissoes;
  recursos: Recursos;
}): Verificacao<{ missao: TipoMissao; recursos: Recursos }, MotivoRecusaMissao> {
  const missao = TIPOS_MISSAO.find((m) => m === entrada.missao);
  if (!missao) return { ok: false, motivo: 'missao_desconhecida' };
  if (entrada.resgatadas.includes(missao)) return { ok: false, motivo: 'ja_resgatada' };
  if (!missaoCumprida(missao, entrada.situacao)) return { ok: false, motivo: 'nao_cumprida' };
  const teto = capacidadeArmazem(entrada.situacao.predios.armazem);
  const recompensa = recompensaMissao(missao);
  const recursos = Object.fromEntries(
    RECURSOS.map((r) => [r, Math.max(entrada.recursos[r], Math.min(teto, entrada.recursos[r] + recompensa[r]))]),
  ) as Recursos;
  return { ok: true, missao, recursos };
}
