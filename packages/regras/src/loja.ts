// Loja de gemas: terminar na hora a obra que está sendo feita. Gema só se ganha comprando (Pix).
import { BALANCEAMENTO } from './balanceamento.ts';
import { reprogramar } from './cancelamento.ts';
import type { NiveisPredios, Obra, TipoPredio, Verificacao } from './tipos.ts';

/** Preço em gemas do próximo "terminar agora", depois de `usos` na mesma temporada: base, 2×, 4×, 8×… */
export function precoTerminarObra(usos: number): number {
  return BALANCEAMENTO.loja.terminarObra.precoBase * 2 ** Math.max(0, Math.floor(usos));
}

/** Total gasto em gemas nos primeiros `usos` de uma temporada (base × (2^usos − 1)). */
export function gastoTerminarObra(usos: number): number {
  let total = 0;
  for (let i = 0; i < usos; i++) total += precoTerminarObra(i);
  return total;
}

/** Pacote de gemas à venda (quantidade de gemas) e o preço dele em reais. */
export function precoPacoteReais(gemas: number): number {
  return gemas * BALANCEAMENTO.loja.reaisPorGema;
}

export function pacoteValido(gemas: unknown): gemas is number {
  return typeof gemas === 'number' && (BALANCEAMENTO.loja.pacotes as readonly number[]).includes(gemas);
}

/** Pode usar gemas para terminar uma obra deste prédio neste nível (sem olhar o saldo)? */
export function obraAceleravel(tipo: TipoPredio, nivelAlvo: number): boolean {
  const { nivelMaximo, prediosProibidos } = BALANCEAMENTO.loja.terminarObra;
  return nivelAlvo <= nivelMaximo && !prediosProibidos.includes(tipo);
}

export type MotivoRecusaTerminarObra = 'sem_obra' | 'item_invalido' | 'predio_proibido' | 'nivel_alto' | 'gemas_insuficientes';

/**
 * Termina agora a obra que está sendo feita (a primeira da fila, ordenada por `prontoEm`). As de depois andam
 * para a frente: a próxima começa agora, com a mesma duração. `prontoEm` identifica a obra que o jogador viu; se
 * a fila mudou, recusa. Devolve o prédio e o nível que ficam prontos, a fila que sobra e o preço.
 */
export function terminarObraAgora<T extends Obra>(entrada: {
  predios: NiveisPredios;
  obras: readonly T[];
  prontoEm: number;
  gemas: number;
  /** Quantas vezes o jogador já usou nesta temporada. */
  usos: number;
  agora: number;
}): Verificacao<{ tipo: TipoPredio; nivelAlvo: number; obras: T[]; preco: number }, MotivoRecusaTerminarObra> {
  const { predios, obras, prontoEm, gemas, usos, agora } = entrada;
  const primeira = obras[0];
  if (!primeira) return { ok: false, motivo: 'sem_obra' };
  if (primeira.prontoEm !== prontoEm) return { ok: false, motivo: 'item_invalido' };
  const nivelAlvo = predios[primeira.tipo] + 1;
  if (BALANCEAMENTO.loja.terminarObra.prediosProibidos.includes(primeira.tipo)) return { ok: false, motivo: 'predio_proibido' };
  if (!obraAceleravel(primeira.tipo, nivelAlvo)) return { ok: false, motivo: 'nivel_alto' };
  const preco = precoTerminarObra(usos);
  if (gemas < preco) return { ok: false, motivo: 'gemas_insuficientes' };
  return {
    ok: true,
    tipo: primeira.tipo,
    nivelAlvo,
    obras: reprogramar(obras, obras.map((_, i) => i !== 0), agora),
    preco,
  };
}
