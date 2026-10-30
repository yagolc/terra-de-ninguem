// Edge Function `cidade`: comandos do jogador, validados com o pacote de regras.
// Corpo: { acao: 'entrar' } (funda a cidade e sorteia o objetivo) | { acao: 'evoluir_predio', tipo } | { acao: 'alocar_trabalhadores', alocacao }
//      | { acao: 'treinar_tropas', tipo, quantidade }
//      | { acao: 'enviar_marcha', origem_id, destino_id, tipo: 'saque' | 'conquista', tropas }
//      | { acao: 'marcar_relatorios_lidos' }
// Publicar com: npx supabase functions deploy cidade --no-verify-jwt (o token é validado no código).
import {
  MENSAGENS_ALOCACAO,
  MENSAGENS_ATAQUE,
  MENSAGENS_EVOLUCAO,
  MENSAGENS_TREINO,
  TIPOS_ATAQUE,
  TIPOS_PREDIO,
  TIPOS_UNIDADE,
  duracaoMarchaMs,
  mapearExercito,
  subtrairRecursos,
  verificarAlocacao,
  verificarAtaque,
  verificarEvolucao,
  verificarTreino,
  type Recursos,
  type TipoAtaque,
  type TipoPredio,
  type TipoUnidade,
} from '../../../packages/regras/src/index.ts';
import { jogadorDaRequisicao } from '../_compartilhado/auth.ts';
import {
  avancarAteAgora,
  carregarCidade,
  criarCidade,
  lerExercito,
  salvarCidade,
  soldados,
  temporadaAtiva,
  type CidadeAvancada,
  type Temporada,
} from '../_compartilhado/cidade.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { garantirObjetivo } from '../_compartilhado/objetivos.ts';
import { CORS, ErroDoJogo, resposta } from '../_compartilhado/http.ts';

function lerAlocacao(valor: unknown): Recursos {
  const v = (valor ?? {}) as Record<string, unknown>;
  return { comida: Number(v.comida), madeira: Number(v.madeira), ouro: Number(v.ouro) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TerritorioMarcha = { id: string; dono_id: string | null; cidade_principal: boolean; x: number; y: number };

/** Tira as tropas do território de origem e põe a marcha a caminho. Atacar quebra o próprio escudo. */
async function enviarMarcha(
  tx: Transacao,
  temporada: Temporada,
  c: CidadeAvancada,
  corpo: Record<string, unknown>,
  agora: number,
): Promise<number> {
  const tipo = corpo.tipo as TipoAtaque;
  if (!TIPOS_ATAQUE.includes(tipo)) throw new ErroDoJogo('Tipo de ataque desconhecido.');
  const enviar = lerExercito(corpo.tropas);
  const origemId = String(corpo.origem_id ?? '');
  const destinoId = String(corpo.destino_id ?? '');
  if (![origemId, destinoId].every((id) => UUID.test(id))) throw new ErroDoJogo('Território desconhecido.');

  const territorios = await tx<TerritorioMarcha[]>`
    select id, dono_id, cidade_principal, x, y from territorios
     where temporada_id = ${temporada.id} and id in (${origemId}, ${destinoId})`;
  const origem = territorios.find((t) => t.id === origemId);
  const destino = territorios.find((t) => t.id === destinoId);
  if (!origem || !destino || origemId === destinoId) throw new ErroDoJogo('Território desconhecido.');

  const [fronteira] = await tx`
    select 1 from fronteiras
     where (territorio_a = ${origemId} and territorio_b = ${destinoId})
        or (territorio_a = ${destinoId} and territorio_b = ${origemId})`;
  const [escudo] = destino.dono_id
    ? await tx<{ ate: Date }[]>`
        select ate from protecoes where temporada_id = ${temporada.id} and jogador_id = ${destino.dono_id} and tipo = 'escudo'`
    : [];
  const grupo = c.grupos.find((g) => g.territorioId === origemId);

  const v = verificarAtaque({
    tipo,
    enviar,
    disponiveis: grupo?.tropas ?? mapearExercito(() => 0),
    origemDoJogador: origem.dono_id === c.carregada.jogadorId,
    vizinhos: !!fronteira,
    alvo: { donoId: destino.dono_id, cidadePrincipal: destino.cidade_principal },
    jogadorId: c.carregada.jogadorId,
    inicioTemporada: temporada.inicio,
    escudoDoAlvoAte: escudo ? escudo.ate.getTime() : null,
    agora,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_ATAQUE[v.motivo]);

  grupo!.tropas = mapearExercito((t) => grupo!.tropas[t] - enviar[t]);
  const chegada = agora + duracaoMarchaMs(origem, destino, enviar);
  await tx`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria, partida_em, chegada_em)
    values (${temporada.id}, ${c.carregada.jogadorId}, ${origemId}, ${destinoId}, ${tipo},
            ${enviar.lanceiro}, ${enviar.arqueiro}, ${enviar.cavalaria}, ${new Date(agora)}, ${new Date(chegada)})`;
  await tx`delete from protecoes where temporada_id = ${temporada.id} and jogador_id = ${c.carregada.jogadorId} and tipo = 'escudo'`;
  return chegada;
}

async function executar(jogadorId: string, corpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (corpo.acao === 'entrar') {
    // Funda a cidade (se ainda não houver) e sorteia o objetivo secreto (se ainda não houver).
    await sql.begin(async (tx) => {
      await criarCidade(tx, jogadorId);
      await garantirObjetivo(tx, (await temporadaAtiva(tx)).id, jogadorId);
    });
    return { ok: true };
  }
  if (corpo.acao === 'marcar_relatorios_lidos') {
    await sql`update relatorios set lido_atacante = true where atacante_id = ${jogadorId} and not lido_atacante`;
    await sql`update relatorios set lido_defensor = true where defensor_id = ${jogadorId} and not lido_defensor`;
    return { ok: true };
  }

  return await sql.begin(async (tx) => {
    const agora = Date.now();
    const temporada = await temporadaAtiva(tx);
    const c = avancarAteAgora(await carregarCidade(tx, temporada.id, jogadorId), agora);
    const resultado: Record<string, unknown> = { ok: true };

    switch (corpo.acao) {
      case 'evoluir_predio': {
        const tipo = corpo.tipo as TipoPredio;
        if (!TIPOS_PREDIO.includes(tipo)) throw new ErroDoJogo('Prédio desconhecido.');
        const v = verificarEvolucao({ predios: c.estado.predios, tipo, recursos: c.estado.recursos, obras: c.obras, agora });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_EVOLUCAO[v.motivo]);
        c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
        c.novaObra = { tipo, prontoEm: v.prontoEm };
        break;
      }
      case 'alocar_trabalhadores': {
        const alocacao = lerAlocacao(corpo.alocacao);
        const v = verificarAlocacao({ cidade: c.estado, alocacao, soldados: soldados(c) });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_ALOCACAO[v.motivo]);
        c.estado = { ...c.estado, trabalhadores: alocacao };
        break;
      }
      case 'treinar_tropas': {
        const tipo = corpo.tipo as TipoUnidade;
        const quantidade = Number(corpo.quantidade);
        if (!TIPOS_UNIDADE.includes(tipo)) throw new ErroDoJogo('Unidade desconhecida.');
        if (!c.carregada.territorioId) throw new ErroDoJogo('Sua cidade não tem território nesta temporada.', 409);
        const v = verificarTreino({ cidade: c.estado, tipo, quantidade, soldados: soldados(c), fila: c.fila, agora });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_TREINO[v.motivo]);
        c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
        c.novoLote = { tipo, quantidade, prontoEm: v.prontoEm };
        break;
      }
      case 'enviar_marcha': {
        resultado.chegada_em = new Date(await enviarMarcha(tx, temporada, c, corpo, agora)).toISOString();
        break;
      }
      default:
        throw new ErroDoJogo('Ação desconhecida.');
    }

    await salvarCidade(tx, c);
    return resultado;
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
