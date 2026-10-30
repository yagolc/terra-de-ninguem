// Carregar, avançar e salvar a cidade de um jogador. Usado pela função `cidade` (comandos do jogador)
// e pela `resolver-marchas` (batalhas). Tudo dentro da transação de quem chama.
import {
  TIPOS_PREDIO,
  avancarCidade,
  bonusDeTerritorios,
  cidadeInicial,
  distribuirPerdas,
  escolherCor,
  escolherTerritorioLivre,
  exercito,
  grafoDeFronteiras,
  mapearExercito,
  soldadosNaConta,
  somarExercitos,
  totalUnidades,
  type EstadoCidade,
  type Exercito,
  type LoteTreino,
  type Obra,
  type Recurso,
  type Recursos,
  type TipoPredio,
  type TipoUnidade,
} from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';

export type Temporada = { id: string; inicio: number };

export async function temporadaAtiva(tx: Transacao): Promise<Temporada> {
  const [t] = await tx<{ id: string; inicio: Date }[]>`select id, inicio from temporadas where status = 'ativa'`;
  if (!t) throw new ErroDoJogo('Nenhuma temporada em andamento.', 409);
  return { id: t.id, inicio: t.inicio.getTime() };
}

/**
 * Território onde nasce a cidade: o reservado para o jogador na criação da temporada ou, para quem
 * chegou depois, a vaga inicial (ou o território) livre mais distante de todos. `null` sem mapa.
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
  const vagas = territorios.filter((t) => t.vaga_inicial && !t.ocupado).map((t) => t.id);
  const livre =
    escolherTerritorioLivre({ todos: vagas, grafo, ocupadosOuReservados }) ??
    escolherTerritorioLivre({ todos: territorios.map((t) => t.id), grafo, ocupadosOuReservados });
  if (!livre) throw new ErroDoJogo('O mapa desta temporada está cheio. Aguarde a próxima temporada.', 409);
  return livre;
}

/** Funda a cidade do jogador na temporada ativa, se ele ainda não tiver uma. */
export async function criarCidade(tx: Transacao, jogadorId: string): Promise<void> {
  const { id: temporadaId } = await temporadaAtiva(tx);
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

  // Cor no mapa: mantém a do jogador se ninguém mais nesta temporada a usa; senão, a primeira livre.
  const [eu] = await tx<{ cor: string | null }[]>`select cor from jogadores where id = ${jogadorId}`;
  const outras = await tx<{ cor: string | null }[]>`
    select j.cor from cidades c join jogadores j on j.id = c.jogador_id
     where c.temporada_id = ${temporadaId} and c.jogador_id <> ${jogadorId}`;
  const usadas = new Set(outras.map((o) => o.cor?.toLowerCase()));
  if (!eu?.cor || usadas.has(eu.cor.toLowerCase())) {
    await tx`update jogadores set cor = ${escolherCor(outras.map((o) => o.cor))} where id = ${jogadorId}`;
  }
}

export type GrupoTropas = { id: string | null; territorioId: string; tropas: Exercito };
type LoteSalvo = LoteTreino & { id: string };
type ObraSalva = Obra & { id: string };

export type CidadeCarregada = {
  id: string;
  temporadaId: string;
  jogadorId: string;
  /** Território da cidade principal (null na temporada de testes, sem mapa). */
  territorioId: string | null;
  cidade: EstadoCidade;
  obras: ObraSalva[];
  fila: LoteSalvo[];
  bonus: Recursos;
  /** Tropas paradas, uma entrada por território. */
  grupos: GrupoTropas[];
  /** Tropas em marcha: comem e ocupam população, mas não desertam. */
  emMarcha: Exercito;
};

/** Lê e trava a cidade do jogador e as tropas paradas dele até o fim da transação. */
export async function carregarCidade(tx: Transacao, temporadaId: string, jogadorId: string): Promise<CidadeCarregada> {
  const [linha] = await tx<
    {
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
    }[]
  >`
    select id, territorio_id, comida, madeira, ouro, populacao,
           trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em
      from cidades
     where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}
       for update`;
  if (!linha) throw new ErroDoJogo('Você ainda não tem cidade nesta temporada.', 404);

  // Bônus de produção de todos os territórios do jogador nesta temporada.
  const territorios = await tx<{ bonus_recurso: Recurso }[]>`
    select bonus_recurso from territorios where temporada_id = ${temporadaId} and dono_id = ${jogadorId}`;

  const linhasPredios = await tx<{ tipo: TipoPredio; nivel: number }[]>`select tipo, nivel from predios where cidade_id = ${linha.id}`;
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as EstadoCidade['predios'];
  for (const p of linhasPredios) predios[p.tipo] = p.nivel;

  const linhasObras = await tx<{ id: string; tipo: TipoPredio; pronto_em: Date }[]>`
    select id, tipo, pronto_em from obras where cidade_id = ${linha.id} order by pronto_em`;
  const linhasFila = await tx<{ id: string; tipo_unidade: TipoUnidade; quantidade: number; pronto_em: Date }[]>`
    select id, tipo_unidade, quantidade, pronto_em from filas_treino where cidade_id = ${linha.id} order by pronto_em`;
  const linhasTropas = await tx<{ id: string; territorio_id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>`
    select id, territorio_id, lanceiro, arqueiro, cavalaria
      from tropas where temporada_id = ${temporadaId} and dono_id = ${jogadorId}
       for update`;
  const [emMarcha] = await tx<{ lanceiro: number; arqueiro: number; cavalaria: number }[]>`
    select coalesce(sum(lanceiro), 0)::int as lanceiro, coalesce(sum(arqueiro), 0)::int as arqueiro,
           coalesce(sum(cavalaria), 0)::int as cavalaria
      from marchas where temporada_id = ${temporadaId} and jogador_id = ${jogadorId} and status = 'a_caminho'`;

  return {
    id: linha.id,
    temporadaId,
    jogadorId,
    territorioId: linha.territorio_id,
    obras: linhasObras.map((o) => ({ id: o.id, tipo: o.tipo, prontoEm: o.pronto_em.getTime() })),
    fila: linhasFila.map((l) => ({ id: l.id, tipo: l.tipo_unidade, quantidade: l.quantidade, prontoEm: l.pronto_em.getTime() })),
    bonus: bonusDeTerritorios(territorios.map((t) => t.bonus_recurso)),
    grupos: linhasTropas.map((t) => ({
      id: t.id,
      territorioId: t.territorio_id,
      tropas: exercito({ lanceiro: t.lanceiro, arqueiro: t.arqueiro, cavalaria: t.cavalaria }),
    })),
    emMarcha: exercito(emMarcha),
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

/** Cidade avançada até `agora`, pronta para o comando mexer e `salvarCidade` gravar. */
export type CidadeAvancada = {
  carregada: CidadeCarregada;
  estado: EstadoCidade;
  grupos: GrupoTropas[];
  /** Obras e lotes que ainda não terminaram. */
  obras: ObraSalva[];
  fila: LoteSalvo[];
  /** Tropas paradas + em marcha, depois da deserção. */
  tropasTotais: Exercito;
  novaObra: Obra | null;
  novoLote: LoteTreino | null;
};

/**
 * Avança até agora: produção, obras e lotes de treino que terminaram (tropas novas vão para o território
 * da cidade), consumo de comida e deserção (só das tropas paradas, na proporção de cada território).
 */
export function avancarAteAgora(c: CidadeCarregada, agora: number): CidadeAvancada {
  const avancada = avancarCidade({
    cidade: c.cidade,
    tropas: somarExercitos(exercito(), c.emMarcha, ...c.grupos.map((g) => g.tropas)),
    obras: c.obras,
    treinos: c.fila,
    agora,
    bonusTerritorios: c.bonus,
  });

  const resultado: CidadeAvancada = {
    carregada: c,
    estado: avancada.cidade,
    grupos: c.grupos.map((g) => ({ ...g })),
    obras: avancada.obras,
    fila: avancada.treinos,
    tropasTotais: avancada.tropas,
    novaObra: null,
    novoLote: null,
  };
  if (c.territorioId) {
    for (const lote of avancada.lotesConcluidos) {
      const grupo = grupoEm(resultado, c.territorioId);
      grupo.tropas = { ...grupo.tropas, [lote.tipo]: grupo.tropas[lote.tipo] + lote.quantidade };
    }
  }
  const perdas = distribuirPerdas(resultado.grupos.map((g) => g.tropas), avancada.desertores);
  resultado.grupos = resultado.grupos.map((g, i) => ({ ...g, tropas: mapearExercito((t) => g.tropas[t] - perdas[i]![t]) }));
  return resultado;
}

/** Grupo de tropas do jogador num território (criado vazio se ainda não existir). */
export function grupoEm(c: CidadeAvancada, territorioId: string): GrupoTropas {
  let grupo = c.grupos.find((g) => g.territorioId === territorioId);
  if (!grupo) {
    grupo = { id: null, territorioId, tropas: exercito() };
    c.grupos.push(grupo);
  }
  return grupo;
}

/** Soldados para a conta da população: paradas, em marcha e em treino. */
export function soldados(c: CidadeAvancada): number {
  return soldadosNaConta(totalUnidades(c.tropasTotais), c.fila);
}

/** Grava cidade, prédios, tropas, obras e fila de treino. */
export async function salvarCidade(tx: Transacao, c: CidadeAvancada): Promise<void> {
  const { id, temporadaId, jogadorId } = c.carregada;
  const e = c.estado;
  await tx`
    update cidades
       set comida = ${e.recursos.comida}, madeira = ${e.recursos.madeira}, ouro = ${e.recursos.ouro},
           populacao = ${e.populacao},
           trabalhadores_comida = ${e.trabalhadores.comida},
           trabalhadores_madeira = ${e.trabalhadores.madeira},
           trabalhadores_ouro = ${e.trabalhadores.ouro},
           atualizado_em = ${new Date(e.atualizadoEm)}
     where id = ${id}`;
  await tx`update predios set nivel = (${tx.json(e.predios)}::jsonb ->> tipo)::int where cidade_id = ${id}`;

  for (const g of c.grupos) {
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

  const restantes = new Set([...c.obras.map((o) => o.id), ...c.fila.map((l) => l.id)]);
  const obrasProntas = c.carregada.obras.filter((o) => !restantes.has(o.id)).map((o) => o.id);
  const lotesProntos = c.carregada.fila.filter((l) => !restantes.has(l.id)).map((l) => l.id);
  if (obrasProntas.length > 0) await tx`delete from obras where id = any(${obrasProntas}::uuid[])`;
  if (lotesProntos.length > 0) await tx`delete from filas_treino where id = any(${lotesProntos}::uuid[])`;
  if (c.novaObra) {
    await tx`insert into obras (cidade_id, tipo, pronto_em) values (${id}, ${c.novaObra.tipo}, ${new Date(c.novaObra.prontoEm)})`;
  }
  if (c.novoLote) {
    await tx`
      insert into filas_treino (cidade_id, tipo_unidade, quantidade, pronto_em)
      values (${id}, ${c.novoLote.tipo}, ${c.novoLote.quantidade}, ${new Date(c.novoLote.prontoEm)})`;
  }
}

export function lerExercito(valor: unknown): Exercito {
  const v = (valor ?? {}) as Record<string, unknown>;
  return { lanceiro: Number(v.lanceiro ?? 0), arqueiro: Number(v.arqueiro ?? 0), cavalaria: Number(v.cavalaria ?? 0) };
}
