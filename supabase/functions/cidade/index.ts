// Edge Function `cidade`: comandos da cidade do jogador, validados com o pacote de regras.
// Corpo: { acao: 'entrar' } | { acao: 'evoluir_predio', tipo } | { acao: 'alocar_trabalhadores', alocacao }
// Publicar com: npx supabase functions deploy cidade --no-verify-jwt (o token é validado no código).
import {
  MENSAGENS_ALOCACAO,
  MENSAGENS_EVOLUCAO,
  TIPOS_PREDIO,
  avancarCidade,
  cidadeInicial,
  exercito,
  subtrairRecursos,
  verificarAlocacao,
  verificarEvolucao,
  type EstadoCidade,
  type Obra,
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

/** Cria a cidade inicial do jogador na temporada ativa, se ele ainda não tiver uma. */
async function criarCidade(tx: Transacao, jogadorId: string): Promise<void> {
  const temporadaId = await temporadaAtiva(tx);
  const inicial = cidadeInicial(Date.now());
  const [criada] = await tx<{ id: string }[]>`
    insert into cidades (temporada_id, jogador_id, comida, madeira, ouro, populacao, atualizado_em)
    values (${temporadaId}, ${jogadorId}, ${inicial.recursos.comida}, ${inicial.recursos.madeira},
            ${inicial.recursos.ouro}, ${inicial.populacao}, ${new Date(inicial.atualizadoEm)})
    on conflict (temporada_id, jogador_id) do nothing
    returning id`;
  if (!criada) return;

  const predios = TIPOS_PREDIO.map((tipo) => ({ cidade_id: criada.id, tipo, nivel: inicial.predios[tipo] }));
  await tx`insert into predios ${tx(predios)}`;
}

/** Lê e trava a cidade do jogador até o fim da transação. */
async function carregarCidade(tx: Transacao, jogadorId: string): Promise<{ id: string; cidade: EstadoCidade; obra: Obra | null }> {
  const temporadaId = await temporadaAtiva(tx);
  const [linha] = await tx<LinhaCidade[]>`
    select id, comida, madeira, ouro, populacao, trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em
      from cidades
     where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}
       for update`;
  if (!linha) throw new ErroDoJogo('Você ainda não tem cidade nesta temporada.', 404);

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
    const { id, cidade, obra } = await carregarCidade(tx, jogadorId);
    // Tropas entram no Épico 5; até lá ninguém consome comida.
    const avancada = avancarCidade({ cidade, tropas: exercito(), obra, agora });
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
