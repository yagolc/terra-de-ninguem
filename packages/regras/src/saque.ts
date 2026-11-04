import { BALANCEAMENTO } from './balanceamento.ts';
import { protecaoArmazem } from './predios.ts';
import { RECURSOS, TIPOS_UNIDADE, type Exercito, type Recursos } from './tipos.ts';
import { mapearRecursos } from './util.ts';

/** Quanto as tropas carregam; `bonusCarga` é o herói saqueador (0,2 = +20%). */
export function capacidadeCarga(tropas: Exercito, bonusCarga = 0): number {
  return TIPOS_UNIDADE.reduce((soma, tipo) => soma + tropas[tipo] * BALANCEAMENTO.unidades[tipo].carga, 0) * (1 + bonusCarga);
}

/**
 * Quanto um saque vitorioso leva. Proteções do GDD: o armazém guarda uma parte fora do alcance e o
 * saque leva no máximo 30% do que sobra. Se as tropas não carregam tudo, cada recurso é reduzido na
 * mesma proporção.
 */
export function calcularSaque(entrada: {
  estoque: Recursos;
  nivelArmazem: number;
  sobreviventes: Exercito;
  bonusCarga?: number;
}): Recursos {
  const { estoque, nivelArmazem, sobreviventes } = entrada;
  const protecao = protecaoArmazem(nivelArmazem);
  const alcancavel = mapearRecursos(
    (r) => Math.max(0, estoque[r] - protecao) * BALANCEAMENTO.saque.maximoDoDesprotegido,
  );

  const total = RECURSOS.reduce((soma, r) => soma + alcancavel[r], 0);
  const carga = capacidadeCarga(sobreviventes, entrada.bonusCarga);
  const fator = total <= carga ? 1 : carga / total;
  return mapearRecursos((r) => Math.floor(alcancavel[r] * fator));
}
