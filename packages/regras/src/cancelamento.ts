// Cancelar uma obra ou um lote de treino: devolve tudo o que foi pago e adianta o resto da fila.
import { niveisProjetados, custoEvolucao } from './predios.ts';
import { custoTreino } from './treino.ts';
import type { LoteTreino, NiveisPredios, Obra, Recursos, Verificacao } from './tipos.ts';
import { recursos, somarRecursos } from './util.ts';

/**
 * Fila sem os itens removidos, com os horários refeitos. As filas são sequenciais (cada item começa quando o
 * anterior termina), então a duração de cada um é a distância até o fim do anterior. O primeiro, se ficou,
 * mantém o horário (já está andando); os outros começam quando o de antes termina, ou agora.
 */
export function reprogramar<T extends { prontoEm: number }>(fila: readonly T[], fica: readonly boolean[], agora: number): T[] {
  const novos: T[] = [];
  let fim = agora;
  fila.forEach((item, i) => {
    if (!fica[i]) return;
    if (i === 0) {
      fim = item.prontoEm;
      novos.push(item);
      return;
    }
    const duracao = item.prontoEm - fila[i - 1]!.prontoEm;
    fim = Math.max(fim, agora) + duracao;
    novos.push({ ...item, prontoEm: fim });
  });
  return novos;
}

export type MotivoRecusaCancelamento = 'item_invalido';

/**
 * Cancela a obra na posição `indice` da fila (ordenada por `prontoEm`). Saem junto as obras de depois que
 * dependem dela: as do mesmo prédio (seriam níveis acima) e as que passariam do Centro da Cidade sem a obra
 * do Centro cancelada. Devolve o custo de todas as que saem.
 */
export function cancelarObra<T extends Obra>(entrada: {
  predios: NiveisPredios;
  obras: readonly T[];
  indice: number;
  agora: number;
}): Verificacao<{ obras: T[]; canceladas: { tipo: Obra['tipo']; nivelAlvo: number }[]; devolver: Recursos }, MotivoRecusaCancelamento> {
  const { predios, obras, indice, agora } = entrada;
  if (!Number.isInteger(indice) || indice < 0 || indice >= obras.length) return { ok: false, motivo: 'item_invalido' };

  // Nível alvo de cada obra, pela ordem da fila.
  const niveis = obras.map((o, i) => niveisProjetados(predios, obras.slice(0, i + 1))[o.tipo]);
  const fica = obras.map((_, i) => i !== indice);
  for (let i = indice + 1; i < obras.length; i++) {
    const o = obras[i]!;
    if (o.tipo === obras[indice]!.tipo) fica[i] = false;
  }
  // Prédios acima do Centro que sobrou (o Centro só limita os outros).
  for (let i = 0; i < obras.length; i++) {
    if (!fica[i]) continue;
    const antes = obras.slice(0, i + 1).filter((_, j) => fica[j]);
    const centro = niveisProjetados(predios, antes).centro;
    const o = obras[i]!;
    if (o.tipo !== 'centro' && niveis[i]! > centro) fica[i] = false;
  }

  const canceladas = obras.flatMap((o, i) => (fica[i] ? [] : [{ tipo: o.tipo, nivelAlvo: niveis[i]! }]));
  const devolver = somarRecursos(recursos(), ...canceladas.map((c) => custoEvolucao(c.tipo, c.nivelAlvo)));
  return { ok: true, obras: reprogramar(obras, fica, agora), canceladas, devolver };
}

/** Cancela o lote de treino na posição `indice` da fila: devolve o custo e adianta os lotes de depois. */
export function cancelarTreino<T extends LoteTreino>(entrada: {
  fila: readonly T[];
  indice: number;
  agora: number;
}): Verificacao<{ fila: T[]; devolver: Recursos }, MotivoRecusaCancelamento> {
  const { fila, indice, agora } = entrada;
  if (!Number.isInteger(indice) || indice < 0 || indice >= fila.length) return { ok: false, motivo: 'item_invalido' };
  const lote = fila[indice]!;
  return {
    ok: true,
    fila: reprogramar(fila, fila.map((_, i) => i !== indice), agora),
    devolver: custoTreino(lote.tipo, lote.quantidade),
  };
}
