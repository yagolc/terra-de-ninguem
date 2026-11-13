// Perfil do jogador (tabela `jogadores`, vale para todas as temporadas): ação `salvar_perfil` da função `cidade`.
import { MENSAGENS_PERFIL, verificarPerfil } from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';
import { desbloqueiosDoJogador } from './loja.ts';
import { gravarNomeJogador } from './nome.ts';

/**
 * Grava nome, bandeira e descrição. A cor principal não pode ser a de outro jogador com cidade na temporada em
 * andamento; sem temporada, qualquer cor da paleta (a fundação troca se alguém já tiver pegado).
 */
export async function salvarPerfil(tx: Transacao, jogadorId: string, corpo: Record<string, unknown>) {
  const nome = await gravarNomeJogador(tx, jogadorId, corpo.nome);

  const [ativa] = await tx<{ id: string }[]>`select id from temporadas where status = 'ativa'`;
  // Mesma trava da fundação: ninguém pega a mesma cor ao mesmo tempo.
  if (ativa) await tx`select pg_advisory_xact_lock(hashtext(${ativa.id}))`;
  const outras = ativa
    ? await tx<{ cor: string | null }[]>`
        select j.cor from cidades c join jogadores j on j.id = c.jogador_id
         where c.temporada_id = ${ativa.id} and j.id <> ${jogadorId}`
    : [];

  const v = verificarPerfil(
    { cor: corpo.cor, corSecundaria: corpo.cor_secundaria, padrao: corpo.padrao, emblema: corpo.emblema, descricao: corpo.descricao },
    outras.map((o) => o.cor),
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
  return { nome, ...v.bandeira, descricao: v.descricao };
}
