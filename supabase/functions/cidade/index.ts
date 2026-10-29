// Edge Function `cidade`: comandos da cidade do jogador, validados com o pacote de regras.
// Corpo: { acao: 'entrar' } | { acao: 'evoluir_predio', tipo } | { acao: 'alocar_trabalhadores', alocacao }
// Publicar com: npx supabase functions deploy cidade --no-verify-jwt (o token é validado no código).
import {
  MENSAGENS_ALOCACAO,
  MENSAGENS_EVOLUCAO,
  TIPOS_PREDIO,
  avancarCidade,
  bonusDeTerritorios,
  cidadeInicial,
  escolherTerritorioLivre,
  exercito,
  grafoDeFronteiras,
  subtrairRecursos,
  verificarAlocacao,
  verificarEvolucao,
  type EstadoCidade,
  type Obra,
  type Recurso,
  type Recursos,
  type TipoPredio,
} from '../../../packages/regras/src/index.ts';
import { jogadorDaRequisicao } from '../_compartilhado/auth.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { CORS, ErroDoJogo, resposta } from '../_compartilhado/http.ts';

type LinhaCidade = {
  id: string;
  comida: number;
  madeira: number;
  ouro: number;
  populacao: number;
  trabalhadores_comida: number;
  trabalhadores_madeira: number;
  trabalhadores_ouro: number;
  atualizado_em: Date;
};

type LinhaPredio = { tipo: TipoPredio; nivel: number; pronto_em: Date | null };

async function temporadaAtiva(tx: Transacao): Promise<string> {
  const [temporada] = await tx<{ id: string }[]>`select id from temporadas where status = 'ativa'`;
  if (!temporada) throw new ErroDoJogo('Nenhuma temporada em andamento.', 409);
  return temporada.id;
}

/**
 * Território onde nasce a cidade: o reservado para o jogador na criação da temporada ou, para quem
 * chegou depois, o livre mais distante de todos. `null` se a temporada não tem mapa.
 */
async function territorioInicial(tx: Transacao, temporadaId: string, jogadorId: string): Promise<string | null> {
  const [reservado] = await tx<{ id: string }[]>`
    select id from territorios
     where temporada_id = ${temporadaId} and reservado_para = ${jogadorId} and dono_id is null`;
  if (reservado) return reservado.id;

  const territorios = await tx<{ id: string; ocupado: boolean; vaga_inicial: boolean }[]>`
    select id, (dono_id is not null or reservado_para is not null) as ocupado, vaga_inicial
      from territorios where temporada_id = ${temporadaId}`;
  if (territorios.length === 0) return null;

  const fronteiras = await tx<{ territorio_a: string; territorio_b: string }[]>`
    select territorio_a, territorio_b from fronteiras where temporada_id = ${temporadaId}`;
  const grafo = grafoDeFronteiras(fronteiras.map((f) => [f.territorio_a, f.territorio_b] as const));
  const ocupadosOuReservados = new Set(territorios.filter((t) => t.ocupado).map((t) => t.id));
  // Primeiro as vagas iniciais que o gerador equilibrou; depois qualquer território livre.
  const vagas = territorios.filter((t) => t.vaga_inicial && !t.ocupado).map((t) => t.id);
  const livre =
    escolherTerritorioLivre({ todos: vagas, grafo, ocupadosOuReservados }) ??
    escolherTerritorioLivre({ todos: territorios.map((t) => t.id), grafo, ocupadosOuReservados });
  if (!livre) throw new ErroDoJogo('O mapa desta temporada está cheio. Aguarde a próxima temporada.', 409);
  return livre;
}

/** Funda a cidade do jogador na temporada ativa, se ele ainda não tiver uma. */
async function criarCidade(tx: Transacao, jogadorId: string): Promise<void> {
  const temporadaId = await temporadaAtiva(tx);
  // Dois jogadores chegando juntos não podem pegar o mesmo território livre.
  await tx`select pg_advisory_xact_lock(hashtext(${temporadaId}))`;
  const [existente] = await tx`select 1 from cidades where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}`;
  if (existente) return;

  const territorioId = await territorioInicial(tx, temporadaId, jogadorId);
  const inicial = cidadeInicial(Date.now());
  const [criada] = await tx<{ id: string }[]>`
    insert into cidades (temporada_id, jogador_id, territorio_id, comida, madeira, ouro, populacao, atualizado_em)
    values (${temporadaId}, ${jogadorId}, ${territorioId}, ${inicial.recursos.comida}, ${inicial.recursos.madeira},
            ${inicial.recursos.ouro}, ${inicial.populacao}, ${new Date(inicial.atualizadoEm)})
    returning id`;

  const predios = TIPOS_PREDIO.map((tipo) => ({ cidade_id: criada!.id, tipo, nivel: inicial.predios[tipo] }));
  await tx`insert into predios ${tx(predios)}`;
  if (territorioId) {
    await tx`
      update territorios set dono_id = ${jogadorId}, cidade_principal = true, reservado_para = ${jogadorId}
       where id = ${territorioId}`;
  }
}

/** Lê e trava a cidade do jogador até o fim da transação. */
async function carregarCidade(
  tx: Transacao,
  jogadorId: string,
): Promise<{ id: string; cidade: EstadoCidade; obra: Obra | null; bonus: Recursos }> {
  const temporadaId = await temporadaAtiva(tx);
  const [linha] = await tx<LinhaCidade[]>`
    select id, comida, madeira, ouro, populacao, trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em
      from cidades
     where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}
       for update`;
  if (!linha) throw new ErroDoJogo('Você ainda não tem cidade nesta temporada.', 404);

  // Bônus de produção de todos os territórios do jogador nesta temporada.
  const territorios = await tx<{ bonus_recurso: Recurso }[]>`
    select bonus_recurso from territorios where temporada_id = ${temporadaId} and dono_id = ${jogadorId}`;
  const bonus = bonusDeTerritorios(territorios.map((t) => t.bonus_recurso));

  const linhasPredios = await tx<LinhaPredio[]>`select tipo, nivel, pronto_em from predios where cidade_id = ${linha.id}`;
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as EstadoCidade['predios'];
  let obra: Obra | null = null;
  for (const p of linhasPredios) {
    predios[p.tipo] = p.nivel;
    if (p.pronto_em) obra = { tipo: p.tipo, prontoEm: p.pronto_em.getTime() };
  }

  return {
    id: linha.id,
    obra,
    bonus,
    cidade: {
      recursos: { comida: linha.comida, madeira: linha.madeira, ouro: linha.ouro },
      populacao: linha.populacao,
      trabalhadores: {
        comida: linha.trabalhadores_comida,
        madeira: linha.trabalhadores_madeira,
        ouro: linha.trabalhadores_ouro,
      },
      predios,
      atualizadoEm: linha.atualizado_em.getTime(),
    },
  };
}

async function salvarCidade(tx: Transacao, id: string, cidade: EstadoCidade, obra: Obra | null): Promise<void> {
  await tx`
    update cidades
       set comida = ${cidade.recursos.comida}, madeira = ${cidade.recursos.madeira}, ouro = ${cidade.recursos.ouro},
           populacao = ${cidade.populacao},
           trabalhadores_comida = ${cidade.trabalhadores.comida},
           trabalhadores_madeira = ${cidade.trabalhadores.madeira},
           trabalhadores_ouro = ${cidade.trabalhadores.ouro},
           atualizado_em = ${new Date(cidade.atualizadoEm)}
     where id = ${id}`;
  // Limpa a obra antiga antes de marcar a nova, por causa do índice "uma obra por cidade".
  await tx`
    update predios
       set nivel = (${tx.json(cidade.predios)}::jsonb ->> tipo)::int, pronto_em = null
     where cidade_id = ${id}`;
  if (obra) {
    await tx`update predios set pronto_em = ${new Date(obra.prontoEm)} where cidade_id = ${id} and tipo = ${obra.tipo}`;
  }
}

function lerAlocacao(valor: unknown): Recursos {
  const v = (valor ?? {}) as Record<string, unknown>;
  return { comida: Number(v.comida), madeira: Number(v.madeira), ouro: Number(v.ouro) };
}

async function executar(jogadorId: string, corpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (corpo.acao === 'entrar') {
    await sql.begin((tx) => criarCidade(tx, jogadorId));
    return { ok: true };
  }

  return await sql.begin(async (tx) => {
    const agora = Date.now();
    const { id, cidade, obra, bonus } = await carregarCidade(tx, jogadorId);
    // Tropas entram no Épico 5; até lá ninguém consome comida.
    const avancada = avancarCidade({ cidade, tropas: exercito(), obra, agora, bonusTerritorios: bonus });
    let estado = avancada.cidade;
    let novaObra = avancada.obra;

    switch (corpo.acao) {
      case 'evoluir_predio': {
        const tipo = corpo.tipo as TipoPredio;
        if (!TIPOS_PREDIO.includes(tipo)) throw new ErroDoJogo('Prédio desconhecido.');
        const v = verificarEvolucao({
          predios: estado.predios,
          tipo,
          recursos: estado.recursos,
          construcaoEmAndamento: novaObra !== null,
        });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_EVOLUCAO[v.motivo]);
        estado = { ...estado, recursos: subtrairRecursos(estado.recursos, v.custo) };
        novaObra = { tipo, prontoEm: agora + v.tempoMs };
        break;
      }
      case 'alocar_trabalhadores': {
        const alocacao = lerAlocacao(corpo.alocacao);
        const v = verificarAlocacao({ cidade: estado, alocacao, soldados: 0 });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_ALOCACAO[v.motivo]);
        estado = { ...estado, trabalhadores: alocacao };
        break;
      }
      default:
        throw new ErroDoJogo('Ação desconhecida.');
    }

    await salvarCidade(tx, id, estado, novaObra);
    return { ok: true };
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
