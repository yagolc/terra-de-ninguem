// Nome do jogador (tabela `jogadores`, vale para todas as temporadas): na fundação da cidade e na ação `trocar_nome`.
import { MENSAGENS_NOME, verificarNomeJogador } from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';

/** Grava o nome novo do jogador, se for válido e ninguém mais usar. Devolve o nome como ficou gravado. */
export async function gravarNomeJogador(tx: Transacao, jogadorId: string, nome: unknown): Promise<string> {
  // Dois jogadores escolhendo o mesmo nome ao mesmo tempo: um espera o outro.
  await tx`select pg_advisory_xact_lock(hashtext('nomes_dos_jogadores'))`;
  const outros = await tx<{ nome: string }[]>`select nome from jogadores where id <> ${jogadorId}`;
  const v = verificarNomeJogador(String(nome ?? ''), outros.map((o) => o.nome));
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_NOME[v.motivo]);
  await tx`update jogadores set nome = ${v.nome} where id = ${jogadorId}`;
  return v.nome;
}
