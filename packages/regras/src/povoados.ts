// Povoados: vilas e cidades livres dentro dos territórios (GDD: "Povoados").
import { BALANCEAMENTO } from './balanceamento.ts';
import { capacidadeCarga } from './saque.ts';
import { RECURSOS, type Exercito, type Recursos, type TipoPovoado, type Verificacao } from './tipos.ts';
import { HORA_MS, mapearRecursos, recursos, temRecursos } from './util.ts';

export type MotivoRecusaVila = 'povoado_invalido' | 'nivel_maximo' | 'recursos_insuficientes';

/** Fração (0 a 1) do estoque cheio que a vila neutra tem agora; `saqueadaEm` nulo = nunca saqueada (cheia). */
function fracaoEstoque(saqueadaEm: number | null, agora: number): number {
  if (saqueadaEm === null) return 1;
  return Math.min(1, Math.max(0, (agora - saqueadaEm) / (BALANCEAMENTO.povoados.vila.horasParaEncher * HORA_MS)));
}

/** Estoque da vila neutra agora: vazio logo depois de um saque e cheio de novo em `horasParaEncher`. */
export function estoqueVila(saqueadaEm: number | null, agora: number): Recursos {
  const fracao = fracaoEstoque(saqueadaEm, agora);
  return mapearRecursos((r) => Math.floor(BALANCEAMENTO.povoados.vila.estoque[r] * fracao));
}

/** Instante em que a vila fica cheia de novo (ms). */
export function vilaCheiaEm(saqueadaEm: number | null, agora: number): number {
  return saqueadaEm === null ? agora : Math.max(agora, saqueadaEm + BALANCEAMENTO.povoados.vila.horasParaEncher * HORA_MS);
}

/** Leva `disponivel` inteiro se couber na carga; senão, cada recurso na mesma proporção. Devolve a fração levada. */
function levar(disponivel: Recursos, sobreviventes: Exercito): { saque: Recursos; fator: number } {
  const total = RECURSOS.reduce((soma, r) => soma + disponivel[r], 0);
  const carga = capacidadeCarga(sobreviventes);
  const fator = total === 0 ? 1 : Math.min(1, carga / total);
  return { saque: mapearRecursos((r) => Math.floor(disponivel[r] * fator)), fator };
}

/**
 * Saque vitorioso numa vila neutra: leva o que couber na carga (sem o limite de 30%, que protege jogadores).
 * O que sobra continua lá: o novo `saqueadaEm` é recuado para o estoque voltar a encher a partir do resto.
 */
export function saquearVilaNeutra(entrada: { saqueadaEm: number | null; agora: number; sobreviventes: Exercito }): {
  saque: Recursos;
  saqueadaEm: number;
} {
  const { saqueadaEm, agora, sobreviventes } = entrada;
  const fracao = fracaoEstoque(saqueadaEm, agora);
  const { saque, fator } = levar(estoqueVila(saqueadaEm, agora), sobreviventes);
  const resta = fracao * (1 - fator);
  return { saque, saqueadaEm: agora - resta * BALANCEAMENTO.povoados.vila.horasParaEncher * HORA_MS };
}

/** Custo de levar a vila ao `nivelAlvo`. */
export function custoNivelVila(nivelAlvo: number): Recursos {
  return mapearRecursos((r) => BALANCEAMENTO.povoados.vila.custoPorNivel[r] * nivelAlvo);
}

/**
 * Saque vitorioso na vila de outro jogador: ela volta ao nível 0 e o saqueador leva parte do que foi
 * investido nos níveis (até a carga). O estoque da cidade do dono não é tocado.
 */
export function saquearVilaDeJogador(entrada: { nivel: number; sobreviventes: Exercito }): Recursos {
  const investido = recursos();
  for (let n = 1; n <= entrada.nivel; n++) {
    const custo = custoNivelVila(n);
    for (const r of RECURSOS) investido[r] += custo[r];
  }
  const fracao = BALANCEAMENTO.povoados.vila.fracaoSaqueInvestido;
  return levar(
    mapearRecursos((r) => Math.floor(investido[r] * fracao)),
    entrada.sobreviventes,
  ).saque;
}

/** Confere a melhoria de uma vila do jogador. */
export function verificarMelhoriaVila(entrada: {
  povoado: { tipo: TipoPovoado; nivel: number } | null;
  doJogador: boolean;
  recursos: Recursos;
}): Verificacao<{ nivelAlvo: number; custo: Recursos }, MotivoRecusaVila> {
  const { povoado } = entrada;
  if (!povoado || povoado.tipo !== 'vila' || !entrada.doJogador) return { ok: false, motivo: 'povoado_invalido' };
  const nivelAlvo = povoado.nivel + 1;
  if (nivelAlvo > BALANCEAMENTO.povoados.vila.nivelMaximo) return { ok: false, motivo: 'nivel_maximo' };
  const custo = custoNivelVila(nivelAlvo);
  if (!temRecursos(entrada.recursos, custo)) return { ok: false, motivo: 'recursos_insuficientes' };
  return { ok: true, nivelAlvo, custo };
}

/**
 * A partir de quando o povoado conquistado dá bônus: na hora, se era neutro; depois de `lealdadeHoras`, se
 * foi tomado de outro jogador (a lealdade ao antigo dono demora a passar).
 */
export function lealDesdeNaConquista(agora: number, tomadoDeJogador: boolean): number {
  return tomadoDeJogador ? agora + BALANCEAMENTO.povoados.lealdadeHoras * HORA_MS : agora;
}

export function povoadoLeal(lealDesde: number | null, agora: number): boolean {
  return lealDesde !== null && lealDesde <= agora;
}

/** Bônus de todos os povoados leais do jogador: população máxima a mais (vilas) e ouro fixo por hora (cidades livres). */
export function bonusDosPovoados(
  povoados: readonly { tipo: TipoPovoado; nivel: number; lealDesde: number | null }[],
  agora: number,
): { populacaoExtra: number; producaoFixaHora: Recursos } {
  const config = BALANCEAMENTO.povoados;
  let populacaoExtra = 0;
  const producaoFixaHora = recursos();
  for (const p of povoados) {
    if (!povoadoLeal(p.lealDesde, agora)) continue;
    if (p.tipo === 'vila') populacaoExtra += config.vila.populacaoPorNivel * p.nivel;
    else producaoFixaHora.ouro += config.cidadeLivre.ouroHora;
  }
  return { populacaoExtra, producaoFixaHora };
}
