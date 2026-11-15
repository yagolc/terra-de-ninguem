// Edge Function `salas`: partidas em paralelo. Só o organizador (tabela `organizadores`) mexe aqui.
// Corpo: { acao: 'criar_sala', nome, acesso: 'aberta' | 'convite', jogadores_maximo, duracao_dias, semente?, convidados?: string[] }
//        (cria a sala e a temporada 1 dela, com mapa novo, numa transação)
//      | { acao: 'nova_temporada', sala_id, semente? } (próxima temporada de uma sala sem temporada em andamento)
//      | { acao: 'convidar', sala_id, jogador_id } | { acao: 'desconvidar', sala_id, jogador_id } (salas por convite)
//      | { acao: 'arquivar_sala', sala_id } (encerra a temporada em andamento sem vencedor e tira a sala do menu)
// A Sala principal continua com o `npm run temporada:nova` e não é arquivada daqui.
// O mapa sai do mesmo gerador do `temporada:nova` (`deno.json` aponta o `d3-delaunay` para o npm): com a mesma
// semente e o mesmo número de jogadores, é o mesmo mapa da prévia que o site desenha.
// Publicar com: npx supabase functions deploy salas --no-verify-jwt (o token é validado no código).
import { MENSAGENS_SALA, sementeValida, verificarSala } from '../../../packages/regras/src/index.ts';
import { escolherMelhorMapa } from '../../../packages/regras/src/mapa/gerador.ts';
import { linhasDoMapa } from '../../../packages/regras/src/mapa/linhas.ts';
import { jogadorDaRequisicao } from '../_compartilhado/auth.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { CORS, ErroDoJogo, resposta } from '../_compartilhado/http.ts';

async function exigirOrganizador(tx: Transacao, jogadorId: string): Promise<boolean> {
  const [org] = await tx<{ ok: boolean }[]>`select exists (select 1 from organizadores where jogador_id = ${jogadorId}) as ok`;
  return org?.ok ?? false;
}

/** Sala que o organizador pode mexer: existe e não é a principal. Trava a linha. */
async function salaSecundaria(tx: Transacao, salaId: unknown) {
  const [sala] = await tx<{ id: string; principal: boolean; jogadores_maximo: number; duracao_dias: number; status: string }[]>`
    select id, principal, jogadores_maximo, duracao_dias, status from salas where id::text = ${String(salaId ?? '')} for update`;
  if (!sala) throw new ErroDoJogo('Sala desconhecida.', 404);
  if (sala.principal) throw new ErroDoJogo('A Sala principal muda pelo temporada:nova.', 409);
  return sala;
}

/** Grava a temporada nova da sala (ativa desde agora) e o mapa dela. Devolve o id e o número. */
async function criarTemporada(
  tx: Transacao,
  sala: { id: string; jogadores_maximo: number; duracao_dias: number },
  sementePedida: number | null,
): Promise<{ id: string; numero: number; semente: number }> {
  const sementeBase = sementePedida ?? Math.floor(Math.random() * 1_000_000);
  const { mapa } = escolherMelhorMapa({ sementeBase, jogadores: sala.jogadores_maximo });
  const linhas = linhasDoMapa(mapa, () => crypto.randomUUID());

  const [temporada] = await tx<{ id: string; numero: number }[]>`
    insert into temporadas (sala_id, numero, status, semente, inicio, fim_previsto)
    values (${sala.id}, (select coalesce(max(numero), 0) + 1 from temporadas where sala_id = ${sala.id}), 'ativa', ${mapa.semente},
            now(), now() + make_interval(days => ${sala.duracao_dias}))
    returning id, numero`;
  const t = temporada!.id;

  await tx`
    insert into regioes (id, temporada_id, indice, nome, terreno)
    select r.id, ${t}, r.indice, r.nome, r.terreno
      from jsonb_to_recordset(${tx.json(linhas.regioes)}) as r(id uuid, indice int, nome text, terreno text)`;
  await tx`
    insert into territorios (id, temporada_id, regiao_id, indice, nome, terreno, bonus_recurso, x, y, poligono, vaga_inicial, guarnicao_inicial)
    select r.id, ${t}, r.regiao_id, r.indice, r.nome, r.terreno, r.bonus_recurso, r.x, r.y, r.poligono, r.vaga_inicial, r.guarnicao_inicial
      from jsonb_to_recordset(${tx.json(linhas.territorios)}) as r(
        id uuid, regiao_id uuid, indice int, nome text, terreno text, bonus_recurso text, x double precision, y double precision,
        poligono jsonb, vaga_inicial boolean, guarnicao_inicial jsonb)`;
  await tx`
    insert into fronteiras (temporada_id, territorio_a, territorio_b)
    select ${t}, r.territorio_a, r.territorio_b
      from jsonb_to_recordset(${tx.json(linhas.fronteiras)}) as r(territorio_a uuid, territorio_b uuid)`;
  if (linhas.barreiras.length > 0) {
    await tx`
      insert into barreiras (temporada_id, territorio_a, territorio_b, tipo)
      select ${t}, r.territorio_a, r.territorio_b, r.tipo
        from jsonb_to_recordset(${tx.json(linhas.barreiras)}) as r(territorio_a uuid, territorio_b uuid, tipo text)`;
  }
  await tx`
    insert into tropas (temporada_id, territorio_id, dono_id, lanceiro, arqueiro, cavalaria)
    select ${t}, r.territorio_id, null, r.lanceiro, r.arqueiro, r.cavalaria
      from jsonb_to_recordset(${tx.json(linhas.tropas)}) as r(territorio_id uuid, lanceiro int, arqueiro int, cavalaria int)`;
  await tx`
    insert into povoados (temporada_id, territorio_id, tipo)
    select ${t}, r.territorio_id, r.tipo
      from jsonb_to_recordset(${tx.json(linhas.povoados)}) as r(territorio_id uuid, tipo text)`;
  return { id: t, numero: temporada!.numero, semente: mapa.semente };
}

/** Põe na lista de convidados os jogadores que existem (os outros ids são ignorados). */
async function convidar(tx: Transacao, salaId: string, jogadores: readonly unknown[], por: string) {
  const ids = jogadores.map((j) => String(j ?? '')).filter(Boolean);
  if (ids.length === 0) return;
  await tx`
    insert into salas_membros (sala_id, jogador_id, convidado_por)
    select ${salaId}, j.id, ${por} from jogadores j where j.id::text = any(${ids}::text[])
    on conflict do nothing`;
}

async function executar(jogadorId: string, corpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  return await sql.begin(async (tx) => {
    if (!(await exigirOrganizador(tx, jogadorId))) throw new ErroDoJogo(MENSAGENS_SALA.nao_organizador, 403);
    // Uma mudança de sala por vez (nome único, número da temporada).
    await tx`select pg_advisory_xact_lock(hashtext('salas'))`;

    if (corpo.acao === 'criar_sala') {
      const outras = await tx<{ nome: string }[]>`select nome from salas`;
      const v = verificarSala({
        organizador: true,
        nome: corpo.nome,
        acesso: corpo.acesso,
        jogadoresMaximo: corpo.jogadores_maximo,
        duracaoDias: corpo.duracao_dias,
        semente: corpo.semente,
        nomesDasOutras: outras.map((o) => o.nome),
      });
      if (!v.ok) throw new ErroDoJogo(MENSAGENS_SALA[v.motivo]);
      const [sala] = await tx<{ id: string; jogadores_maximo: number; duracao_dias: number }[]>`
        insert into salas (nome, criador_id, acesso, jogadores_maximo, duracao_dias)
        values (${v.sala.nome}, ${jogadorId}, ${v.sala.acesso}, ${v.sala.jogadoresMaximo}, ${v.sala.duracaoDias})
        returning id, jogadores_maximo, duracao_dias`;
      // Quem cria sempre pode entrar, mesmo numa sala por convite.
      await convidar(tx, sala!.id, [jogadorId, ...(Array.isArray(corpo.convidados) ? corpo.convidados : [])], jogadorId);
      const temporada = await criarTemporada(tx, sala!, v.semente);
      return { ok: true, sala_id: sala!.id, temporada_id: temporada.id, numero: temporada.numero, semente: temporada.semente };
    }

    if (corpo.acao === 'nova_temporada') {
      const sala = await salaSecundaria(tx, corpo.sala_id);
      if (sala.status === 'arquivada') throw new ErroDoJogo('Esta sala foi arquivada.', 409);
      const [ativa] = await tx`select 1 from temporadas where sala_id = ${sala.id} and status = 'ativa'`;
      if (ativa) throw new ErroDoJogo('A temporada desta sala ainda está em andamento.', 409);
      const semente = corpo.semente ?? null;
      if (semente !== null && !sementeValida(semente)) throw new ErroDoJogo(MENSAGENS_SALA.semente_invalida);
      const temporada = await criarTemporada(tx, sala, semente);
      return { ok: true, temporada_id: temporada.id, numero: temporada.numero, semente: temporada.semente };
    }

    if (corpo.acao === 'convidar' || corpo.acao === 'desconvidar') {
      const sala = await salaSecundaria(tx, corpo.sala_id);
      if (corpo.acao === 'convidar') await convidar(tx, sala.id, [corpo.jogador_id], jogadorId);
      else await tx`delete from salas_membros where sala_id = ${sala.id} and jogador_id::text = ${String(corpo.jogador_id ?? '')}`;
      return { ok: true };
    }

    if (corpo.acao === 'arquivar_sala') {
      const sala = await salaSecundaria(tx, corpo.sala_id);
      // A temporada em andamento acaba sem vencedor (não entra para o herdeiro) e os objetivos ficam públicos.
      await tx`update temporadas set status = 'encerrada', encerrada_em = now() where sala_id = ${sala.id} and status = 'ativa'`;
      await tx`update salas set status = 'arquivada' where id = ${sala.id}`;
      return { ok: true };
    }

    throw new ErroDoJogo('Ação desconhecida.');
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  try {
    const jogadorId = await jogadorDaRequisicao(req);
    const corpo = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return resposta(200, await executar(jogadorId, corpo));
  } catch (erro) {
    if (erro instanceof ErroDoJogo) return resposta(erro.status, { erro: erro.message });
    console.error(erro);
    return resposta(500, { erro: 'Erro inesperado no servidor. Tente de novo.' });
  }
});
