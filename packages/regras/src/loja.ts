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

// ---------------------------------------------------------------------------------------------------------------
// Itens da loja: visuais (bandeiras exclusivas, títulos, cores) e o destaque da cidade no mapa.

export type ItemLoja = keyof typeof BALANCEAMENTO.loja.itens;
export const ITENS_LOJA = Object.keys(BALANCEAMENTO.loja.itens) as ItemLoja[];

/** Títulos à venda (um item `titulo` por título): aparecem no placar e no perfil. */
export const TITULOS_LOJA = {
  mecenas: 'Mecenas da Coroa',
  senhor_do_ouro: 'Senhor do Ouro',
  lobo_da_fronteira: 'Lobo da Fronteira',
  arquiteto: 'Arquiteto do Reino',
  voz_dos_pombos: 'Voz dos Pombos',
  carrasco: 'Carrasco dos Bárbaros',
  conquistador: 'Conquistador',
  tirano: 'Tirano Benevolente',
} as const;
export type TituloLoja = keyof typeof TITULOS_LOJA;
export const TIPOS_TITULO = Object.keys(TITULOS_LOJA) as TituloLoja[];

/** Cores exclusivas: viram cor principal ou segunda cor de quem comprou (a principal continua sem repetir). */
export const CORES_LOJA = { cor_ouro: '#c9a227', cor_prata: '#a8b2bd' } as const;

/** Uma compra já feita: o item, a variante (o título) e a temporada (itens de temporada). */
export type ItemComprado = { item: string; variante: string | null; temporadaId: string | null };

/** O que as compras permanentes liberam no perfil. */
export type Desbloqueios = { bandeirasExclusivas: boolean; cores: string[]; titulos: TituloLoja[] };
export const SEM_DESBLOQUEIOS: Desbloqueios = { bandeirasExclusivas: false, cores: [], titulos: [] };

export function desbloqueiosDe(comprados: readonly ItemComprado[]): Desbloqueios {
  const tem = (item: ItemLoja) => comprados.some((c) => c.item === item);
  return {
    bandeirasExclusivas: tem('bandeiras_exclusivas'),
    cores: (Object.keys(CORES_LOJA) as (keyof typeof CORES_LOJA)[]).filter(tem).map((item) => CORES_LOJA[item]),
    titulos: TIPOS_TITULO.filter((t) => comprados.some((c) => c.item === 'titulo' && c.variante === t)),
  };
}

/** O item já foi comprado (permanente: em qualquer temporada; de temporada: nesta). */
export function itemComprado(comprados: readonly ItemComprado[], item: ItemLoja, variante: string | null, temporadaId: string | null): boolean {
  const permanente = BALANCEAMENTO.loja.itens[item].escopo === 'permanente';
  return comprados.some(
    (c) => c.item === item && (c.variante ?? null) === variante && (permanente || (temporadaId !== null && c.temporadaId === temporadaId)),
  );
}

export type MotivoRecusaCompra = 'item_invalido' | 'ja_comprado' | 'sem_temporada' | 'gemas_insuficientes';

/** Confere a compra de um item: item e variante válidos, ainda não comprado, temporada ativa (se for de temporada) e saldo. */
export function verificarCompraItem(entrada: {
  item: unknown;
  variante?: unknown;
  saldo: number;
  comprados: readonly ItemComprado[];
  /** Temporada ativa (null fora de temporada). */
  temporadaId: string | null;
}): Verificacao<{ item: ItemLoja; variante: string | null; preco: number; temporadaId: string | null }, MotivoRecusaCompra> {
  const item = ITENS_LOJA.find((i) => i === entrada.item);
  if (!item) return { ok: false, motivo: 'item_invalido' };
  let variante: string | null = null;
  if (item === 'titulo') {
    const titulo = TIPOS_TITULO.find((t) => t === entrada.variante);
    if (!titulo) return { ok: false, motivo: 'item_invalido' };
    variante = titulo;
  }
  const { preco, escopo } = BALANCEAMENTO.loja.itens[item];
  if (escopo === 'temporada' && entrada.temporadaId === null) return { ok: false, motivo: 'sem_temporada' };
  if (itemComprado(entrada.comprados, item, variante, entrada.temporadaId)) return { ok: false, motivo: 'ja_comprado' };
  if (entrada.saldo < preco) return { ok: false, motivo: 'gemas_insuficientes' };
  return { ok: true, item, variante, preco, temporadaId: escopo === 'temporada' ? entrada.temporadaId : null };
}

/** Título que o jogador quer mostrar: nenhum (null) ou um que ele comprou. */
export function verificarTitulo(titulo: unknown, desbloqueios: Desbloqueios): Verificacao<{ titulo: TituloLoja | null }, 'titulo_nao_comprado'> {
  if (titulo === null || titulo === undefined || titulo === '') return { ok: true, titulo: null };
  const t = desbloqueios.titulos.find((d) => d === titulo);
  return t ? { ok: true, titulo: t } : { ok: false, motivo: 'titulo_nao_comprado' };
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
