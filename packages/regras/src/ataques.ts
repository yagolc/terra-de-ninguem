// Regras de envio de ataques e proteções (GDD: "Ataques, defesa e proteções").
import { BALANCEAMENTO } from './balanceamento.ts';
import { capacidadeArmazem } from './predios.ts';
import { RECURSOS, TIPOS_UNIDADE, type Exercito, type Recursos, type Verificacao } from './tipos.ts';
import { HORA_MS, mapearRecursos, totalUnidades } from './util.ts';

export const TIPOS_ATAQUE = ['saque', 'conquista'] as const;
/** Saque leva recursos de uma cidade (num território sem cidade, só mata defensores); conquista toma o território. */
export type TipoAtaque = (typeof TIPOS_ATAQUE)[number];

export type MotivoRecusaAtaque =
  | 'origem_invalida'
  | 'nao_vizinho'
  | 'alvo_proprio'
  | 'sem_tropas'
  | 'tropas_insuficientes'
  | 'cidade_nao_conquistavel'
  | 'protecao_iniciante'
  | 'alvo_com_escudo';

/** Até quando vale a proteção de iniciante da temporada (ms). */
export function fimProtecaoIniciante(inicioTemporada: number): number {
  return inicioTemporada + BALANCEAMENTO.protecoes.inicianteHoras * HORA_MS;
}

/** Até quando vale o escudo de quem acabou de perder uma defesa (ms). */
export function escudoAte(agora: number): number {
  return agora + BALANCEAMENTO.protecoes.escudoHoras * HORA_MS;
}

/**
 * Confere um ataque antes de a marcha sair. Só se ataca a partir de um território próprio e contra um
 * vizinho dele; jogadores ficam protegidos no começo da temporada e enquanto tiverem escudo; a cidade
 * principal pode ser saqueada, mas nunca conquistada.
 */
export function verificarAtaque(entrada: {
  tipo: TipoAtaque;
  /** Tropas que o jogador quer mandar. */
  enviar: Exercito;
  /** Tropas do jogador paradas no território de origem. */
  disponiveis: Exercito;
  origemDoJogador: boolean;
  /** O destino faz fronteira com a origem. */
  vizinhos: boolean;
  alvo: { donoId: string | null; cidadePrincipal: boolean };
  jogadorId: string;
  inicioTemporada: number;
  /** Fim do escudo do dono do alvo, se houver. */
  escudoDoAlvoAte: number | null;
  agora: number;
}): Verificacao<object, MotivoRecusaAtaque> {
  const { tipo, enviar, disponiveis, alvo, agora } = entrada;

  if (!entrada.origemDoJogador) return { ok: false, motivo: 'origem_invalida' };
  if (!entrada.vizinhos) return { ok: false, motivo: 'nao_vizinho' };
  if (alvo.donoId === entrada.jogadorId) return { ok: false, motivo: 'alvo_proprio' };
  if (TIPOS_UNIDADE.some((t) => !Number.isInteger(enviar[t]) || enviar[t] < 0) || totalUnidades(enviar) === 0) {
    return { ok: false, motivo: 'sem_tropas' };
  }
  if (TIPOS_UNIDADE.some((t) => enviar[t] > disponiveis[t])) return { ok: false, motivo: 'tropas_insuficientes' };
  if (tipo === 'conquista' && alvo.cidadePrincipal) return { ok: false, motivo: 'cidade_nao_conquistavel' };
  if (alvo.donoId && agora < fimProtecaoIniciante(entrada.inicioTemporada)) {
    return { ok: false, motivo: 'protecao_iniciante' };
  }
  if (alvo.donoId && entrada.escudoDoAlvoAte !== null && agora < entrada.escudoDoAlvoAte) {
    return { ok: false, motivo: 'alvo_com_escudo' };
  }
  return { ok: true };
}

/** Soma o saque trazido pelas tropas ao estoque, sem passar do armazém (estoque acima dele não se perde). */
export function receberSaque(estoque: Recursos, saque: Recursos, nivelArmazem: number): Recursos {
  const teto = capacidadeArmazem(nivelArmazem);
  return mapearRecursos((r) => Math.max(estoque[r], Math.min(teto, estoque[r] + saque[r])));
}

/** Total de recursos carregados, para exibir. */
export function totalSaque(saque: Recursos): number {
  return RECURSOS.reduce((soma, r) => soma + saque[r], 0);
}

export type MotivoRecusaMovimento =
  | 'origem_invalida'
  | 'destino_invalido'
  | 'mesmo_territorio'
  | 'sem_caminho'
  | 'sem_tropas'
  | 'tropas_insuficientes';

/** Confere um movimento de tropas entre dois territórios do próprio jogador, ligados por territórios dele. */
export function verificarMovimento(entrada: {
  enviar: Exercito;
  disponiveis: Exercito;
  origemDoJogador: boolean;
  destinoDoJogador: boolean;
  mesmoTerritorio: boolean;
  /** Origem e destino ligados só por territórios do jogador (`ligadosPorTerritoriosProprios`). */
  ligados: boolean;
}): Verificacao<object, MotivoRecusaMovimento> {
  const { enviar, disponiveis } = entrada;
  if (!entrada.origemDoJogador) return { ok: false, motivo: 'origem_invalida' };
  if (!entrada.destinoDoJogador) return { ok: false, motivo: 'destino_invalido' };
  if (entrada.mesmoTerritorio) return { ok: false, motivo: 'mesmo_territorio' };
  if (!entrada.ligados) return { ok: false, motivo: 'sem_caminho' };
  if (TIPOS_UNIDADE.some((t) => !Number.isInteger(enviar[t]) || enviar[t] < 0) || totalUnidades(enviar) === 0) {
    return { ok: false, motivo: 'sem_tropas' };
  }
  if (TIPOS_UNIDADE.some((t) => enviar[t] > disponiveis[t])) return { ok: false, motivo: 'tropas_insuficientes' };
  return { ok: true };
}
