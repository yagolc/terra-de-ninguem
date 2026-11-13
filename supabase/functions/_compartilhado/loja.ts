// Itens da loja de gemas (função `cidade`): comprar um item e escolher o título. Não precisam de temporada ativa,
// a não ser os itens de temporada (destaque da cidade).
import {
  MENSAGENS_ARAUTO,
  MENSAGENS_COMPRA,
  MENSAGENS_PRESENTE,
  MENSAGENS_TITULO,
  desbloqueiosDe,
  verificarArauto,
  verificarCompraItem,
  verificarPresente,
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
    pedido: corpo.pedido,
    saldo: saldo?.saldo ?? 0,
    comprados: await itensDoJogador(tx, jogadorId),
    temporadaId: ativa?.id ?? null,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_COMPRA[v.motivo]);

  await tx`update gemas set saldo = saldo - ${v.preco}, atualizado_em = now() where jogador_id = ${jogadorId}`;
  await tx`
    insert into itens_comprados (jogador_id, item, variante, temporada_id, gemas, pedido)
    values (${jogadorId}, ${v.item}, ${v.variante}, ${v.temporadaId}, ${v.preco}, ${v.pedido})`;
  if (v.item === 'titulo') await tx`update jogadores set titulo = ${v.variante} where id = ${jogadorId} and titulo is null`;
  return { item: v.item, variante: v.variante, gemas_gastas: v.preco };
}

/** Publica um arauto na temporada ativa: um por jogador no ar, preço dobrando a cada arauto dele na temporada. */
export async function publicarArauto(tx: Transacao, jogadorId: string, texto: unknown) {
  const [ativa] = await tx<{ id: string }[]>`select id from temporadas where status = 'ativa'`;
  if (!ativa) throw new ErroDoJogo('Nenhuma temporada em andamento.', 409);
  const [saldo] = await tx<{ saldo: number }[]>`select saldo from gemas where jogador_id = ${jogadorId} for update`;
  const [meus] = await tx<{ usos: number; ate: Date | null }[]>`
    select count(*)::int as usos, max(ate) as ate from arautos where temporada_id = ${ativa.id} and jogador_id = ${jogadorId}`;
  const agora = Date.now();
  const v = verificarArauto({ texto, saldo: saldo?.saldo ?? 0, usos: meus?.usos ?? 0, noArAte: meus?.ate?.getTime() ?? null, agora });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_ARAUTO[v.motivo]);
  await tx`update gemas set saldo = saldo - ${v.preco}, atualizado_em = now() where jogador_id = ${jogadorId}`;
  await tx`
    insert into arautos (temporada_id, jogador_id, texto, gemas, ate)
    values (${ativa.id}, ${jogadorId}, ${v.texto}, ${v.preco}, ${new Date(v.ate)})`;
  return { ate: new Date(v.ate).toISOString(), gemas_gastas: v.preco };
}

/** Passa gemas do jogador para outro, sem taxa. Trava os dois saldos na ordem dos ids (sem deadlock). */
export async function presentearGemas(tx: Transacao, jogadorId: string, destinatarioId: unknown, gemas: unknown) {
  const para = String(destinatarioId ?? '');
  const [destino] = await tx<{ id: string }[]>`select id from jogadores where id::text = ${para}`;
  if (!destino) throw new ErroDoJogo('Jogador desconhecido.');
  for (const id of [jogadorId, destino.id].sort()) {
    await tx`insert into gemas (jogador_id) values (${id}) on conflict (jogador_id) do nothing`;
    await tx`select saldo from gemas where jogador_id = ${id} for update`;
  }
  const [saldo] = await tx<{ saldo: number }[]>`select saldo from gemas where jogador_id = ${jogadorId}`;
  const v = verificarPresente({ gemas, saldo: saldo?.saldo ?? 0, paraSiMesmo: destino.id === jogadorId });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_PRESENTE[v.motivo]);
  await tx`update gemas set saldo = saldo - ${v.gemas}, atualizado_em = now() where jogador_id = ${jogadorId}`;
  await tx`update gemas set saldo = saldo + ${v.gemas}, atualizado_em = now() where jogador_id = ${destino.id}`;
  await tx`insert into presentes_gemas (remetente_id, destinatario_id, gemas) values (${jogadorId}, ${destino.id}, ${v.gemas})`;
  return { gemas: v.gemas };
}

/** Escolhe o título mostrado no placar e no perfil (null tira). */
export async function usarTitulo(tx: Transacao, jogadorId: string, titulo: unknown) {
  const v = verificarTitulo(titulo, await desbloqueiosDoJogador(tx, jogadorId));
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_TITULO[v.motivo]);
  await tx`update jogadores set titulo = ${v.titulo} where id = ${jogadorId}`;
  return { titulo: v.titulo };
}
