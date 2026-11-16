// Jogador ausente: quem passa dias sem abrir o jogo perde aos poucos os territórios para rebeldes bárbaros.
// Números em BALANCEAMENTO.ausencia.
import { BALANCEAMENTO } from './balanceamento.ts';
import { TIPOS_UNIDADE, type Exercito } from './tipos.ts';
import { HORA_MS, exercito, somarExercitos, totalUnidades } from './util.ts';

const A = BALANCEAMENTO.ausencia;
const DIA_MS = 24 * HORA_MS;

/** Instante em que quem foi visto por último em `vistoEm` passa a ser 💤 Ausente. */
export function ausenteAPartirDe(vistoEm: number): number {
  return vistoEm + A.diasParaAusente * DIA_MS;
}

/** Instante do aviso no celular ("suas terras vão se rebelar"), antes de ficar ausente. */
export function avisoDeAusenciaEm(vistoEm: number): number {
  return ausenteAPartirDe(vistoEm) - A.avisoHorasAntes * HORA_MS;
}

/** Até quando vale o escudo de quem volta depois de ficar ausente. */
export function escudoDeRetornoAte(agora: number): number {
  return agora + A.escudoRetornoHoras * HORA_MS;
}

/**
 * Quando o próximo território do ausente se rebela: o primeiro na hora em que ele fica ausente, os seguintes a
 * cada `horasEntreRebelioes` depois da última rebelião desta ausência (uma de antes de ele voltar não conta).
 */
export function proximaRebeliaoEm(ausenteDesde: number, ultimaRebeliao: number | null): number {
  if (ultimaRebeliao === null || ultimaRebeliao < ausenteDesde) return ausenteDesde;
  return ultimaRebeliao + A.horasEntreRebelioes * HORA_MS;
}

/**
 * Qual território se rebela: o mais longe da cidade principal (em fronteiras do mapa inteiro), desempatando pelo id
 * para dar sempre o mesmo. A cidade principal nunca. Sem territórios além dela, devolve null.
 */
export function territorioQueSeRebela(entrada: {
  cidadeId: string;
  territorios: readonly string[];
  fronteiras: readonly (readonly [string, string])[];
}): string | null {
  const candidatos = entrada.territorios.filter((t) => t !== entrada.cidadeId);
  if (candidatos.length === 0) return null;
  const vizinhos = new Map<string, string[]>();
  for (const [a, b] of entrada.fronteiras) {
    vizinhos.set(a, [...(vizinhos.get(a) ?? []), b]);
    vizinhos.set(b, [...(vizinhos.get(b) ?? []), a]);
  }
  const distancia = new Map([[entrada.cidadeId, 0]]);
  const fila = [entrada.cidadeId];
  for (let i = 0; i < fila.length; i++) {
    const atual = fila[i]!;
    for (const v of vizinhos.get(atual) ?? []) {
      if (distancia.has(v)) continue;
      distancia.set(v, distancia.get(atual)! + 1);
      fila.push(v);
    }
  }
  // Sem caminho até a cidade (mapa sem a fronteira): conta como o mais longe.
  const longe = (t: string) => distancia.get(t) ?? Number.POSITIVE_INFINITY;
  return [...candidatos].sort((a, b) => longe(b) - longe(a) || (a < b ? -1 : a > b ? 1 : 0))[0]!;
}

/**
 * Guarnição rebelde: as tropas que o ausente deixou no território, completadas (na `composicao`) até a fração do
 * exército médio dos jogadores ativos, e nunca menos que `guarnicaoMinima`. Se ele deixou mais, ficam todas.
 */
export function guarnicaoRebelde(entrada: { deixadas: Exercito; soldadosDosAtivos: readonly number[] }): Exercito {
  const ativos = entrada.soldadosDosAtivos.filter((s) => s > 0);
  const media = ativos.length === 0 ? 0 : ativos.reduce((a, b) => a + b, 0) / ativos.length;
  const alvo = Math.max(A.guarnicaoMinima, Math.round(media * A.fracaoExercitoMedio));
  const falta = alvo - totalUnidades(entrada.deixadas);
  if (falta <= 0) return entrada.deixadas;
  // Maiores restos: a soma do reforço dá exatamente o que falta.
  const partes = TIPOS_UNIDADE.map((tipo) => ({ tipo, bruto: falta * A.composicao[tipo] }));
  const reforco = exercito(Object.fromEntries(partes.map((p) => [p.tipo, Math.floor(p.bruto)])));
  let sobra = falta - totalUnidades(reforco);
  for (const p of [...partes].sort((a, b) => (b.bruto % 1) - (a.bruto % 1))) {
    if (sobra <= 0) break;
    reforco[p.tipo] += 1;
    sobra -= 1;
  }
  return somarExercitos(entrada.deixadas, reforco);
}
