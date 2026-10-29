// Edge Function `cidade`: comandos da cidade do jogador, validados com o pacote de regras.
// Corpo: { acao: 'entrar' } | { acao: 'evoluir_predio', tipo } | { acao: 'alocar_trabalhadores', alocacao }
//      | { acao: 'treinar_tropas', tipo, quantidade }
// Publicar com: npx supabase functions deploy cidade --no-verify-jwt (o token é validado no código).
import {
  MENSAGENS_ALOCACAO,
  MENSAGENS_EVOLUCAO,
  MENSAGENS_TREINO,
  TIPOS_PREDIO,
  TIPOS_UNIDADE,
  avancarCidade,
  bonusDeTerritorios,
  cidadeInicial,
  distribuirPerdas,
  escolherTerritorioLivre,
  exercito,
  grafoDeFronteiras,
  mapearExercito,
  soldadosNaConta,
  somarExercitos,
  subtrairRecursos,
  totalUnidades,
  verificarAlocacao,
  verificarEvolucao,
  verificarTreino,
  type EstadoCidade,
  type Exercito,
  type LoteTreino,
  type Obra,
  type Recurso,
  type Recursos,
  type TipoPredio,
  type TipoUnidade,
} from '../../../packages/regras/src/index.ts';
import { jogadorDaRequisicao } from '../_compartilhado/auth.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { CORS, ErroDoJogo, resposta } from '../_compartilhado/http.ts';

type LinhaCidade = {
  id: string;
  territorio_id: string | null;
  comida: number;
  madeira: number;
  ouro: number;
  populacao: number;
  trabalhadores_comida: number;
  trabalhadores_madeira: number;
  trabalhadores_ouro: number;
  atualizado_em: Date;
};

type LinhaPredio = { tipo: TipoPredio; nivel: number };

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

type GrupoTropas = { id: string | null; territorioId: string; tropas: Exercito };
type LoteSalvo = LoteTreino & { id: string };
type ObraSalva = Obra & { id: string };

type CidadeCarregada = {
  id: string;
  territorioId: string | null;
  cidade: EstadoCidade;
  obras: ObraSalva[];
  bonus: Recursos;
  /** Tropas do jogador, uma entrada por território onde estão. */
  grupos: GrupoTropas[];
  fila: LoteSalvo[];
};

/** Lê e trava a cidade do jogador (e as tropas dele) até o fim da transação. */
async function carregarCidade(tx: Transacao, jogadorId: string): Promise<CidadeCarregada> {
  const temporadaId = await temporadaAtiva(tx);
  const [linha] = await tx<LinhaCidade[]>`
    select id, territorio_id, comida, madeira, ouro, populacao,
           trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em
      from cidades
     where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}
       for update`;
  if (!linha) throw new ErroDoJogo('Você ainda não tem cidade nesta temporada.', 404);

  // Bônus de produção de todos os territórios do jogador nesta temporada.
  const territorios = await tx<{ bonus_recurso: Recurso }[]>`
    select bonus_recurso from territorios where temporada_id = ${temporadaId} and dono_id = ${jogadorId}`;
  const bonus = bonusDeTerritorios(territorios.map((t) => t.bonus_recurso));

  const linhasPredios = await tx<LinhaPredio[]>`select tipo, nivel from predios where cidade_id = ${linha.id}`;
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as EstadoCidade['predios'];
  for (const p of linhasPredios) predios[p.tipo] = p.nivel;
  const linhasObras = await tx<{ id: string; tipo: TipoPredio; pronto_em: Date }[]>`
    select id, tipo, pronto_em from obras where cidade_id = ${linha.id} order by pronto_em`;

  const linhasTropas = await tx<{ id: string; territorio_id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>`
    select id, territorio_id, lanceiro, arqueiro, cavalaria
      from tropas where temporada_id = ${temporadaId} and dono_id = ${jogadorId}
       for update`;
  const linhasFila = await tx<{ id: string; tipo_unidade: TipoUnidade; quantidade: number; pronto_em: Date }[]>`
    select id, tipo_unidade, quantidade, pronto_em from filas_treino where cidade_id = ${linha.id} order by pronto_em`;

  return {
    id: linha.id,
    territorioId: linha.territorio_id,
    obras: linhasObras.map((o) => ({ id: o.id, tipo: o.tipo, prontoEm: o.pronto_em.getTime() })),
    bonus,
    grupos: linhasTropas.map((t) => ({
      id: t.id,
      territorioId: t.territorio_id,
      tropas: exercito({ lanceiro: t.lanceiro, arqueiro: t.arqueiro, cavalaria: t.cavalaria }),
    })),
    fila: linhasFila.map((l) => ({ id: l.id, tipo: l.tipo_unidade, quantidade: l.quantidade, prontoEm: l.pronto_em.getTime() })),
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

async function salvarCidade(tx: Transacao, id: string, cidade: EstadoCidade): Promise<void> {
  await tx`
    update cidades
       set comida = ${cidade.recursos.comida}, madeira = ${cidade.recursos.madeira}, ouro = ${cidade.recursos.ouro},
           populacao = ${cidade.populacao},
           trabalhadores_comida = ${cidade.trabalhadores.comida},
           trabalhadores_madeira = ${cidade.trabalhadores.madeira},
           trabalhadores_ouro = ${cidade.trabalhadores.ouro},
           atualizado_em = ${new Date(cidade.atualizadoEm)}
     where id = ${id}`;
  await tx`update predios set nivel = (${tx.json(cidade.predios)}::jsonb ->> tipo)::int where cidade_id = ${id}`;
}

/** Grava as tropas do jogador: atualiza cada grupo, cria os novos e apaga os que ficaram vazios. */
async function salvarTropas(tx: Transacao, temporadaId: string, jogadorId: string, grupos: GrupoTropas[]): Promise<void> {
  for (const g of grupos) {
    const { lanceiro, arqueiro, cavalaria } = g.tropas;
    if (totalUnidades(g.tropas) === 0) {
      if (g.id) await tx`delete from tropas where id = ${g.id}`;
    } else if (g.id) {
      await tx`update tropas set lanceiro = ${lanceiro}, arqueiro = ${arqueiro}, cavalaria = ${cavalaria} where id = ${g.id}`;
    } else {
      await tx`
        insert into tropas (temporada_id, territorio_id, dono_id, lanceiro, arqueiro, cavalaria)
        values (${temporadaId}, ${g.territorioId}, ${jogadorId}, ${lanceiro}, ${arqueiro}, ${cavalaria})`;
    }
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
    const temporadaId = await temporadaAtiva(tx);
    const { id, territorioId, cidade, obras, bonus, grupos, fila } = await carregarCidade(tx, jogadorId);

    // Avança até agora: produção, obra, lotes de treino que terminaram, consumo de comida e deserção.
    const avancada = avancarCidade({
      cidade,
      tropas: somarExercitos(exercito(), ...grupos.map((g) => g.tropas)),
      obras,
      treinos: fila,
      agora,
      bonusTerritorios: bonus,
    });
    let estado = avancada.cidade;
    let novaObra: Obra | null = null;

    // Lotes prontos entram no território da cidade; a deserção sai de todos os grupos, na proporção.
    let novosGrupos = grupos.map((g) => ({ ...g }));
    if (avancada.lotesConcluidos.length > 0 && territorioId) {
      let daCidade = novosGrupos.find((g) => g.territorioId === territorioId);
      if (!daCidade) {
        daCidade = { id: null, territorioId, tropas: exercito() };
        novosGrupos.push(daCidade);
      }
      for (const lote of avancada.lotesConcluidos) {
        daCidade.tropas = { ...daCidade.tropas, [lote.tipo]: daCidade.tropas[lote.tipo] + lote.quantidade };
      }
    }
    const perdas = distribuirPerdas(novosGrupos.map((g) => g.tropas), avancada.desertores);
    novosGrupos = novosGrupos.map((g, i) => ({ ...g, tropas: mapearExercito((tipo) => g.tropas[tipo] - perdas[i]![tipo]) }));

    const filaRestante = fila.filter((l) => l.prontoEm > agora);
    const soldados = soldadosNaConta(totalUnidades(avancada.tropas), filaRestante);
    let novoLote: LoteTreino | null = null;

    switch (corpo.acao) {
      case 'evoluir_predio': {
        const tipo = corpo.tipo as TipoPredio;
        if (!TIPOS_PREDIO.includes(tipo)) throw new ErroDoJogo('Prédio desconhecido.');
        const v = verificarEvolucao({ predios: estado.predios, tipo, recursos: estado.recursos, obras: avancada.obras, agora });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_EVOLUCAO[v.motivo]);
        estado = { ...estado, recursos: subtrairRecursos(estado.recursos, v.custo) };
        novaObra = { tipo, prontoEm: v.prontoEm };
        break;
      }
      case 'alocar_trabalhadores': {
        const alocacao = lerAlocacao(corpo.alocacao);
        const v = verificarAlocacao({ cidade: estado, alocacao, soldados });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_ALOCACAO[v.motivo]);
        estado = { ...estado, trabalhadores: alocacao };
        break;
      }
      case 'treinar_tropas': {
        const tipo = corpo.tipo as TipoUnidade;
        const quantidade = Number(corpo.quantidade);
        if (!TIPOS_UNIDADE.includes(tipo)) throw new ErroDoJogo('Unidade desconhecida.');
        if (!territorioId) throw new ErroDoJogo('Sua cidade não tem território nesta temporada.', 409);
        const v = verificarTreino({ cidade: estado, tipo, quantidade, soldados, fila: filaRestante, agora });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_TREINO[v.motivo]);
        estado = { ...estado, recursos: subtrairRecursos(estado.recursos, v.custo) };
        novoLote = { tipo, quantidade, prontoEm: v.prontoEm };
        break;
      }
      default:
        throw new ErroDoJogo('Ação desconhecida.');
    }

    await salvarCidade(tx, id, estado);
    await salvarTropas(tx, temporadaId, jogadorId, novosGrupos);
    const obrasProntas = avancada.obrasConcluidas.map((o) => o.id);
    if (obrasProntas.length > 0) await tx`delete from obras where id = any(${obrasProntas}::uuid[])`;
    if (novaObra) {
      await tx`insert into obras (cidade_id, tipo, pronto_em) values (${id}, ${novaObra.tipo}, ${new Date(novaObra.prontoEm)})`;
    }
    const concluidos = fila.filter((l) => l.prontoEm <= agora).map((l) => l.id);
    if (concluidos.length > 0) await tx`delete from filas_treino where id = any(${concluidos}::uuid[])`;
    if (novoLote) {
      await tx`
        insert into filas_treino (cidade_id, tipo_unidade, quantidade, pronto_em)
        values (${id}, ${novoLote.tipo}, ${novoLote.quantidade}, ${new Date(novoLote.prontoEm)})`;
    }
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
