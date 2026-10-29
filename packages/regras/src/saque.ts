import { BALANCEAMENTO } from './balanceamento.ts';
import { protecaoArmazem } from './predios.ts';
import { RECURSOS, TIPOS_UNIDADE, type Exercito, type Recursos } from './tipos.ts';
import { mapearRecursos } from './util.ts';

export function capacidadeCarga(tropas: Exercito): number {
  return TIPOS_UNIDADE.reduce((soma, tipo) => soma + tropas[tipo] * BALANCEAMENTO.unidades[tipo].carga, 0);
}

/**
 * Quanto um saque vitorioso leva. Proteções do GDD: o armazém guarda uma parte fora do alcance e o
 * saque leva no máximo 30% do que sobra. Se as tropas não carregam tudo, cada recurso é reduzido na
 * mesma proporção.
 */
export function calcularSaque(entrada: { estoque: Recursos; nivelArmazem: number; sobreviventes: Exercito }): Recursos {
  const { estoque, nivelArmazem, sobreviventes } = entrada;
  const protecao = protecaoArmazem(nivelArmazem);
  const alcancavel = mapearRecursos(
    (r) => Math.max(0, estoque[r] - protecao) * BALANCEAMENTO.saque.maximoDoDesprotegido,
  );

  const total = RECURSOS.reduce((soma, r) => soma + alcancavel[r], 0);
  const carga = capacidadeCarga(sobreviventes);
  const fator = total <= carga ? 1 : carga / total;
  return mapearRecursos((r) => Math.floor(alcancavel[r] * fator));
}
