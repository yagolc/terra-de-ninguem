// Itens da loja de gemas (função `cidade`): comprar um item e escolher o título. Não precisam de temporada ativa,
// a não ser os itens de temporada (destaque da cidade).
import {
  MENSAGENS_COMPRA,
  MENSAGENS_TITULO,
  desbloqueiosDe,
  verificarCompraItem,
  verificarTitulo,
  type Desbloqueios,
  type ItemComprado,
} from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';

export async function itensDoJogador(tx: Transacao, jogadorId: string): Promise<ItemComprado[]> {
  const linhas = await tx<{ item: string; variante: string | null; temporada_id: string | null }[]>`
    select item, variante, temporada_id from itens_comprados where jogador_id = ${jogadorId}`;
  return linhas.map((l) => ({ item: l.item, variante: l.variante, temporadaId: l.temporada_id }));
}

export async function desbloqueiosDoJogador(tx: Transacao, jogadorId: string): Promise<Desbloqueios> {
  return desbloqueiosDe(await itensDoJogador(tx, jogadorId));
}

/** Compra um item: confere, desconta as gemas e grava. Um título comprado vira o título em uso se não houver outro. */
export async function comprarItem(tx: Transacao, jogadorId: string, corpo: Record<string, unknown>) {
  // A trava do saldo serializa as compras do jogador (e o ⚡, que também trava esta linha).
  const [saldo] = await tx<{ saldo: number }[]>`select saldo from gemas where jogador_id = ${jogadorId} for update`;
  const [ativa] = await tx<{ id: string }[]>`select id from temporadas where status = 'ativa'`;
  const v = verificarCompraItem({
    item: corpo.item,
    variante: corpo.variante,
    saldo: saldo?.saldo ?? 0,
    comprados: await itensDoJogador(tx, jogadorId),
    temporadaId: ativa?.id ?? null,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_COMPRA[v.motivo]);

  await tx`update gemas set saldo = saldo - ${v.preco}, atualizado_em = now() where jogador_id = ${jogadorId}`;
  await tx`
    insert into itens_comprados (jogador_id, item, variante, temporada_id, gemas)
    values (${jogadorId}, ${v.item}, ${v.variante}, ${v.temporadaId}, ${v.preco})`;
  if (v.item === 'titulo') await tx`update jogadores set titulo = ${v.variante} where id = ${jogadorId} and titulo is null`;
  return { item: v.item, variante: v.variante, gemas_gastas: v.preco };
}

/** Escolhe o título mostrado no placar e no perfil (null tira). */
export async function usarTitulo(tx: Transacao, jogadorId: string, titulo: unknown) {
  const v = verificarTitulo(titulo, await desbloqueiosDoJogador(tx, jogadorId));
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_TITULO[v.motivo]);
  await tx`update jogadores set titulo = ${v.titulo} where id = ${jogadorId}`;
  return { titulo: v.titulo };
}
