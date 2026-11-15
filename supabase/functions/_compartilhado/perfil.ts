// Perfil do jogador (tabela `jogadores`, vale para todas as temporadas): ação `salvar_perfil` da função `cidade`.
import { MENSAGENS_PERFIL, verificarPerfil } from '../../../packages/regras/src/index.ts';
import { coresNaTemporada, SALA_PRINCIPAL } from './cidade.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';
import { desbloqueiosDoJogador } from './loja.ts';
import { gravarNomeJogador } from './nome.ts';

/**
 * Grava nome, bandeira e descrição. A cor principal é a preferida (vale para todas as salas) e não pode ser a de
 * outro jogador com cidade na temporada da sala em que o jogador está (`temporada_id`; sem ele, a Sala principal);
 * sem temporada, qualquer cor da paleta (a fundação troca se alguém já tiver pegado). Nas outras partidas em
 * andamento, a cor do mapa muda onde ela estiver livre.
 */
export async function salvarPerfil(tx: Transacao, jogadorId: string, corpo: Record<string, unknown>) {
  const nome = await gravarNomeJogador(tx, jogadorId, corpo.nome);

  const pedida = typeof corpo.temporada_id === 'string' ? corpo.temporada_id : null;
  const [ativa] = pedida
    ? await tx<{ id: string }[]>`select id from temporadas where id::text = ${pedida} and status = 'ativa'`
    : await tx<{ id: string }[]>`select id from temporadas where status = 'ativa' and sala_id = ${SALA_PRINCIPAL}`;
  // Mesma trava da fundação: ninguém pega a mesma cor ao mesmo tempo.
  if (ativa) await tx`select pg_advisory_xact_lock(hashtext(${ativa.id}))`;
  const outras = ativa ? await coresNaTemporada(tx, ativa.id, jogadorId) : [];

  const v = verificarPerfil(
    { cor: corpo.cor, corSecundaria: corpo.cor_secundaria, padrao: corpo.padrao, emblema: corpo.emblema, descricao: corpo.descricao },
    outras,
    // Cores, padrões e formas da loja só para quem comprou.
    await desbloqueiosDoJogador(tx, jogadorId),
  );
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_PERFIL[v.motivo]);

  const { cor, corSecundaria, padrao, emblema } = v.bandeira;
  await tx`
    update jogadores
       set cor = ${cor}, cor_secundaria = ${corSecundaria}, padrao = ${padrao}, emblema = ${tx.json(emblema)},
           descricao = ${v.descricao}
     where id = ${jogadorId}`;

  // A cor no mapa de cada partida em andamento (na ordem dos ids, para as travas não se cruzarem).
  const minhas = await tx<{ id: string; temporada_id: string }[]>`
    select c.id, c.temporada_id from cidades c join temporadas t on t.id = c.temporada_id and t.status = 'ativa'
     where c.jogador_id = ${jogadorId} order by c.temporada_id`;
  for (const m of minhas) {
    if (m.temporada_id !== ativa?.id) await tx`select pg_advisory_xact_lock(hashtext(${m.temporada_id}))`;
    const usadas = (await coresNaTemporada(tx, m.temporada_id, jogadorId)).map((c) => c?.toLowerCase());
    if (!usadas.includes(cor.toLowerCase())) await tx`update cidades set cor = ${cor} where id = ${m.id}`;
  }
  return { nome, ...v.bandeira, descricao: v.descricao };
}
