// Carregar, avançar e salvar a cidade de um jogador. Usado pela função `cidade` (comandos do jogador)
// e pela `resolver-marchas` (batalhas). Tudo dentro da transação de quem chama.
import {
  BALANCEAMENTO,
  TIPOS_PREDIO,
  TIPOS_RACA,
  avancarCidade,
  bonusDeTerritorios,
  bonusDosPovoados,
  bonusIntendente,
  cidadeInicial,
  distribuirPerdas,
  efeitosRaca,
  escolherCor,
  escolherTerritorioLivre,
  exercito,
  grafoDeFronteiras,
  mapearExercito,
  soldadosNaConta,
  somarRecursos,
  somarExercitos,
  totalUnidades,
  type EstadoCidade,
  type Exercito,
  type LoteTreino,
  type Obra,
  type Raca,
  type Recurso,
  type Recursos,
  type TipoPovoado,
  type TipoPredio,
  type TipoUnidade,
  MENSAGENS_ENTRADA_SALA,
  verificarEntradaSala,
  type AcessoSala,
} from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';
import { heroiDoJogador, type HeroiSalvo } from './herois.ts';
import { ErroDoJogo } from './http.ts';
import { gravarNomeJogador } from './nome.ts';

/** Sala de quem não diz a sala (o site antigo e o `temporada:nova`): as temporadas de antes das salas. */
export const SALA_PRINCIPAL = '00000000-0000-0000-0000-000000000001';

export type Temporada = { id: string; inicio: number; salaId: string };

/**
 * A temporada em andamento em que o comando vale: a que o site mandou (`temporada_id`, a da sala escolhida) ou,
 * sem ela, a da Sala principal.
 */
export async function temporadaAtiva(tx: Transacao, temporadaId?: unknown): Promise<Temporada> {
  const pedida = typeof temporadaId === 'string' && temporadaId ? temporadaId : null;
  const [t] = pedida
    ? await tx<{ id: string; inicio: Date; sala_id: string; status: string }[]>`
        select id, inicio, sala_id, status from temporadas where id::text = ${pedida}`
    : await tx<{ id: string; inicio: Date; sala_id: string; status: string }[]>`
        select id, inicio, sala_id, status from temporadas where status = 'ativa' and sala_id = ${SALA_PRINCIPAL}`;
  if (!t) throw new ErroDoJogo('Nenhuma temporada em andamento.', 409);
  if (t.status !== 'ativa') throw new ErroDoJogo('Esta temporada já acabou.', 409);
  return { id: t.id, inicio: t.inicio.getTime(), salaId: t.sala_id };
}

/**
 * Território onde nasce a cidade: o reservado para o jogador na criação da temporada ou, para quem
 * chegou depois, a vaga inicial livre mais distante de todos. Sem vaga inicial livre, a temporada está
 * cheia (o mapa é feito para `BALANCEAMENTO.mapa.jogadoresMaximo`). `null` sem mapa.
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
  const livre = escolherTerritorioLivre({ todos: vagas, grafo, ocupadosOuReservados });
  if (!livre) throw new ErroDoJogo('Esta temporada está cheia. Você entra na próxima, quando o mapa for refeito.', 409);
  return livre;
}

/** O vencedor da última temporada encerrada da mesma sala (o herdeiro do trono caído), ou null. */
export async function herdeiroDoTrono(tx: Transacao, temporadaId: string): Promise<string | null> {
  const [linha] = await tx<{ vencedor_id: string | null }[]>`
    select anterior.vencedor_id from temporadas atual
      join temporadas anterior on anterior.sala_id = atual.sala_id and anterior.numero < atual.numero
     where atual.id = ${temporadaId} and anterior.status = 'encerrada'
     order by anterior.numero desc limit 1`;
  return linha?.vencedor_id ?? null;
}

/**
 * Funda a cidade do jogador na temporada da sala, se ele ainda não tiver uma. Fundar exige escolher a raça
 * (e pode trocar o nome do jogador), ter convite nas salas fechadas e não passar do limite de partidas ao mesmo
 * tempo. O herdeiro do trono recebe a Guarda Real. Devolve a temporada.
 */
export async function criarCidade(
  tx: Transacao,
  jogadorId: string,
  escolha: { raca?: unknown; nome?: unknown } = {},
  temporadaPedida?: unknown,
): Promise<Temporada> {
  const temporada = await temporadaAtiva(tx, temporadaPedida);
  const temporadaId = temporada.id;
  // Dois jogadores chegando juntos não podem pegar o mesmo território livre.
  await tx`select pg_advisory_xact_lock(hashtext(${temporadaId}))`;
  const [existente] = await tx`select 1 from cidades where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}`;
  if (existente) return temporada;

  const [sala] = await tx<{ acesso: AcessoSala; status: string; convidado: boolean }[]>`
    select s.acesso, s.status,
           exists (select 1 from salas_membros m where m.sala_id = s.id and m.jogador_id = ${jogadorId}) as convidado
      from salas s where s.id = ${temporada.salaId}`;
  const [{ partidas } = { partidas: 0 }] = await tx<{ partidas: number }[]>`
    select count(*)::int as partidas from cidades c join temporadas t on t.id = c.temporada_id
     where c.jogador_id = ${jogadorId} and t.status = 'ativa' and t.id <> ${temporadaId}`;
  const entrada = verificarEntradaSala({
    acesso: sala?.acesso ?? 'aberta',
    arquivada: sala?.status === 'arquivada',
    convidado: sala?.convidado ?? false,
    jaTemCidade: false,
    partidasEmAndamento: partidas,
  });
  if (!entrada.ok) throw new ErroDoJogo(MENSAGENS_ENTRADA_SALA[entrada.motivo], 409);

  const raca = TIPOS_RACA.find((r) => r === escolha.raca);
  if (!raca) throw new ErroDoJogo('Escolha sua raça para fundar a cidade.');
  if (escolha.nome !== undefined) await gravarNomeJogador(tx, jogadorId, escolha.nome);
  const guardaReal = (await herdeiroDoTrono(tx, temporadaId)) === jogadorId ? BALANCEAMENTO.herdeiro.guardaReal : 0;

  const territorioId = await territorioInicial(tx, temporadaId, jogadorId);
  const inicial = cidadeInicial(Date.now());
  const [criada] = await tx<{ id: string }[]>`
    insert into cidades (temporada_id, jogador_id, territorio_id, comida, madeira, ouro, populacao, atualizado_em, raca, guarda_real)
    values (${temporadaId}, ${jogadorId}, ${territorioId}, ${inicial.recursos.comida}, ${inicial.recursos.madeira},
            ${inicial.recursos.ouro}, ${inicial.populacao}, ${new Date(inicial.atualizadoEm)}, ${raca}, ${guardaReal})
    returning id`;

  const predios = TIPOS_PREDIO.map((tipo) => ({ cidade_id: criada!.id, tipo, nivel: inicial.predios[tipo] }));
  await tx`insert into predios ${tx(predios)}`;
  if (territorioId) {
    await tx`
      update territorios set dono_id = ${jogadorId}, cidade_principal = true, reservado_para = ${jogadorId}
       where id = ${territorioId}`;
  }

  // Cor no mapa nesta sala: a preferida do jogador se ninguém mais nesta temporada a usa; senão, a primeira livre.
  const [eu] = await tx<{ cor: string | null }[]>`select cor from jogadores where id = ${jogadorId}`;
  const outras = await coresNaTemporada(tx, temporadaId, jogadorId);
  const usadas = new Set(outras.map((o) => o?.toLowerCase()));
  const cor = eu?.cor && !usadas.has(eu.cor.toLowerCase()) ? eu.cor.toLowerCase() : escolherCor(outras);
  await tx`update cidades set cor = ${cor} where id = ${criada!.id}`;
  // Na Sala principal a preferida acompanha (o site antigo pinta o mapa com ela).
  if (temporada.salaId === SALA_PRINCIPAL && cor !== eu?.cor) await tx`update jogadores set cor = ${cor} where id = ${jogadorId}`;
  return temporada;
}

/** Cores no mapa dos outros jogadores da temporada (a da cidade ou, nas cidades antigas, a preferida). */
export async function coresNaTemporada(tx: Transacao, temporadaId: string, menosJogador: string): Promise<(string | null)[]> {
  const linhas = await tx<{ cor: string | null }[]>`
    select coalesce(c.cor, j.cor) as cor from cidades c join jogadores j on j.id = c.jogador_id
     where c.temporada_id = ${temporadaId} and c.jogador_id <> ${menosJogador}`;
  return linhas.map((l) => l.cor);
}

export type GrupoTropas = { id: string | null; territorioId: string; tropas: Exercito };
/** Lote de treino gravado; `territorioId`: acampamento militar onde fica pronto (null = território da cidade). */
type LoteSalvo = LoteTreino & { id: string; territorioId: string | null };
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
  /** Ouro das cidades livres e população a mais das vilas (só povoados leais). */
  producaoFixaHora: Recursos;
  populacaoExtra: number;
  /** Crescimento da população a mais (herói intendente na cidade, raça). */
  bonusCrescimento: number;
  /** Limite das casas a mais (raça humana). */
  bonusPopulacaoMaxima: number;
  /** O herói do jogador (travado), se ele já recrutou um. Ocupa 1 de população. */
  heroi: HeroiSalvo | null;
  /** Raça da temporada (null nas cidades de temporadas antigas). */
  raca: Raca | null;
  /** Lanceiros da Guarda Real que defendem a cidade (só o herdeiro do trono tem). */
  guardaReal: number;
  /** Tropas paradas, uma entrada por território. */
  grupos: GrupoTropas[];
  /** Tropas em marcha: comem e ocupam população, mas não desertam. */
  emMarcha: Exercito;
  /** Territórios do jogador (um lote só fica pronto num acampamento se o território ainda for dele). */
  territoriosProprios: Set<string>;
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
      raca: Raca | null;
      guarda_real: number;
    }[]
  >`
    select id, territorio_id, comida, madeira, ouro, populacao,
           trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em, raca, guarda_real
      from cidades
     where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}
       for update`;
  if (!linha) throw new ErroDoJogo('Você ainda não tem cidade nesta temporada.', 404);

  // Bônus de produção de todos os territórios do jogador nesta temporada (dobrado onde há entreposto pronto).
  const territorios = await tx<{ id: string; bonus_recurso: Recurso; entreposto: boolean }[]>`
    select t.id, t.bonus_recurso,
           exists (select 1 from estruturas e
                    where e.territorio_id = t.id and e.tipo = 'entreposto' and e.pronto_em <= now()) as entreposto
      from territorios t where t.temporada_id = ${temporadaId} and t.dono_id = ${jogadorId}`;

  const povoados = await tx<{ tipo: TipoPovoado; nivel: number; leal_desde: Date | null }[]>`
    select p.tipo, p.nivel, p.leal_desde
      from povoados p join territorios t on t.id = p.territorio_id
     where t.temporada_id = ${temporadaId} and t.dono_id = ${jogadorId}`;
  const bonusPovoados = bonusDosPovoados(
    povoados.map((p) => ({ tipo: p.tipo, nivel: p.nivel, lealDesde: p.leal_desde?.getTime() ?? null })),
    Date.now(),
  );

  // Herói intendente: produção (e crescimento, na cidade) a mais onde ele está.
  const heroi = await heroiDoJogador(tx, temporadaId, jogadorId);
  const intendente = bonusIntendente({
    heroi,
    cidadeTerritorioId: linha.territorio_id,
    recursoDoTerritorio: new Map(territorios.map((t) => [t.id, t.bonus_recurso])),
    agora: Date.now(),
  });

  const linhasPredios = await tx<{ tipo: TipoPredio; nivel: number }[]>`select tipo, nivel from predios where cidade_id = ${linha.id}`;
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as EstadoCidade['predios'];
  for (const p of linhasPredios) predios[p.tipo] = p.nivel;

  const linhasObras = await tx<{ id: string; tipo: TipoPredio; pronto_em: Date }[]>`
    select id, tipo, pronto_em from obras where cidade_id = ${linha.id} order by pronto_em`;
  const linhasFila = await tx<
    { id: string; tipo_unidade: TipoUnidade; quantidade: number; pronto_em: Date; territorio_id: string | null }[]
  >`
    select id, tipo_unidade, quantidade, pronto_em, territorio_id from filas_treino where cidade_id = ${linha.id} order by pronto_em`;
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
    fila: linhasFila.map((l) => ({
      id: l.id,
      tipo: l.tipo_unidade,
      quantidade: l.quantidade,
      prontoEm: l.pronto_em.getTime(),
      territorioId: l.territorio_id,
    })),
    bonus: somarRecursos(
      bonusDeTerritorios(
        territorios.map((t) => t.bonus_recurso),
        territorios.filter((t) => t.entreposto).map((t) => t.bonus_recurso),
      ),
      intendente.bonusTerritorios,
      efeitosRaca(linha.raca).producao,
    ),
    producaoFixaHora: bonusPovoados.producaoFixaHora,
    populacaoExtra: bonusPovoados.populacaoExtra,
    bonusCrescimento: intendente.bonusCrescimento + efeitosRaca(linha.raca).crescimento,
    bonusPopulacaoMaxima: efeitosRaca(linha.raca).populacaoMaxima,
    heroi,
    raca: linha.raca,
    guardaReal: linha.guarda_real,
    grupos: linhasTropas.map((t) => ({
      id: t.id,
      territorioId: t.territorio_id,
      tropas: exercito({ lanceiro: t.lanceiro, arqueiro: t.arqueiro, cavalaria: t.cavalaria }),
    })),
    emMarcha: exercito(emMarcha),
    territoriosProprios: new Set(territorios.map((t) => t.id)),
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
  novoLote: (LoteTreino & { territorioId: string | null }) | null;
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
    producaoFixaHora: c.producaoFixaHora,
    populacaoExtra: c.populacaoExtra,
    bonusCrescimento: c.bonusCrescimento,
    bonusPopulacaoMaxima: c.bonusPopulacaoMaxima,
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
  for (const lote of avancada.lotesConcluidos) {
    // No acampamento militar, se o território ainda é do jogador; senão, na cidade.
    const destino = lote.territorioId && c.territoriosProprios.has(lote.territorioId) ? lote.territorioId : c.territorioId;
    if (destino) {
      const grupo = grupoEm(resultado, destino);
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
/** Soldados para a conta da população: tropas, lotes em treino e o herói (que também é um habitante). */
export function soldados(c: CidadeAvancada): number {
  return soldadosNaConta(totalUnidades(c.tropasTotais), c.fila) + (c.carregada.heroi ? 1 : 0);
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
  // Um cancelamento adianta o resto da fila: grava os horários que mudaram.
  const prontoAntes = new Map([...c.carregada.obras, ...c.carregada.fila].map((i) => [i.id, i.prontoEm]));
  for (const o of c.obras) {
    if (prontoAntes.get(o.id) !== o.prontoEm) await tx`update obras set pronto_em = ${new Date(o.prontoEm)} where id = ${o.id}`;
  }
  for (const l of c.fila) {
    if (prontoAntes.get(l.id) !== l.prontoEm) await tx`update filas_treino set pronto_em = ${new Date(l.prontoEm)} where id = ${l.id}`;
  }
  if (c.novaObra) {
    await tx`insert into obras (cidade_id, tipo, pronto_em) values (${id}, ${c.novaObra.tipo}, ${new Date(c.novaObra.prontoEm)})`;
  }
  if (c.novoLote) {
    await tx`
      insert into filas_treino (cidade_id, tipo_unidade, quantidade, pronto_em, territorio_id)
      values (${id}, ${c.novoLote.tipo}, ${c.novoLote.quantidade}, ${new Date(c.novoLote.prontoEm)}, ${c.novoLote.territorioId})`;
  }
}

export function lerExercito(valor: unknown): Exercito {
  const v = (valor ?? {}) as Record<string, unknown>;
  return { lanceiro: Number(v.lanceiro ?? 0), arqueiro: Number(v.arqueiro ?? 0), cavalaria: Number(v.cavalaria ?? 0) };
}
