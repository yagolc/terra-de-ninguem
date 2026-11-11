// Edge Function `cidade`: comandos do jogador, validados com o pacote de regras.
// Corpo: { acao: 'entrar', raca, nome? } (funda a cidade, se ainda não houver, e sorteia o objetivo) | { acao: 'evoluir_predio', tipo } | { acao: 'alocar_trabalhadores', alocacao }
//      | { acao: 'treinar_tropas', tipo, quantidade }
//      | { acao: 'enviar_marcha', origem_id, destino_id, tipo: 'saque' | 'conquista' | 'movimento', tropas }
//      | { acao: 'enviar_reconhecimento', origem_id, destino_id }
//      | { acao: 'construir_estrutura', territorio_id, tipo: 'torre' | 'palicada' | 'entreposto' }
//      | { acao: 'construir_estrada', territorio_id }
//      | { acao: 'resgatar_missao', missao }
//      | { acao: 'cancelar_obra', pronto_em } | { acao: 'cancelar_treino', pronto_em } (devolvem tudo; pronto_em identifica o item)
//      | { acao: 'melhorar_vila', territorio_id }
//      | { acao: 'recrutar_heroi', nome, especialidade } | { acao: 'treinar_heroi' }
//      | { acao: 'salvar_perfil', nome, cor, cor_secundaria, padrao, emblema, descricao } (não precisa de temporada ativa)
//      (enviar_marcha aceita com_heroi: true para levar o herói, que precisa estar livre na origem)
//      | { acao: 'marcar_relatorios_lidos' }
// Publicar com: npx supabase functions deploy cidade --no-verify-jwt (o token é validado no código).
import {
  MENSAGENS_ALOCACAO,
  MENSAGENS_ATAQUE,
  MENSAGENS_CANCELAMENTO,
  MENSAGENS_ESTRADA,
  MENSAGENS_ESTRUTURA,
  MENSAGENS_EVOLUCAO,
  MENSAGENS_MISSAO,
  MENSAGENS_MOVIMENTO,
  MENSAGENS_RECONHECIMENTO,
  MENSAGENS_RECRUTAMENTO,
  MENSAGENS_TREINO,
  MENSAGENS_TREINO_HEROI,
  MENSAGENS_VILA,
  TIPOS_ATAQUE,
  TIPOS_ESTRUTURA,
  TIPOS_PREDIO,
  TIPOS_UNIDADE,
  bonusHeroi,
  cancelarObra,
  cancelarTreino,
  duracaoMarchaMs,
  efeitosRaca,
  duracaoReconhecimentoMs,
  estradaPronta,
  grafoDeFronteiras,
  habitantesLivres,
  heroiDisponivel,
  ligadosPorTerritoriosProprios,
  mapearExercito,
  multiplicadorEstrada,
  somarRecursos,
  subtrairRecursos,
  totalUnidades,
  verificarAlocacao,
  verificarAtaque,
  verificarEstrada,
  verificarEstrutura,
  verificarEvolucao,
  verificarMelhoriaVila,
  verificarMovimento,
  verificarReconhecimento,
  verificarRecrutamento,
  verificarResgateMissao,
  verificarTreinoHeroi,
  verificarTreino,
  type Recursos,
  type TipoAtaque,
  type TipoEstrutura,
  type TipoPovoado,
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
import { salvarPerfil } from '../_compartilhado/perfil.ts';
import { garantirObjetivo } from '../_compartilhado/objetivos.ts';
import { CORS, ErroDoJogo, resposta } from '../_compartilhado/http.ts';

function lerAlocacao(valor: unknown): Recursos {
  const v = (valor ?? {}) as Record<string, unknown>;
  return { comida: Number(v.comida), madeira: Number(v.madeira), ouro: Number(v.ouro) };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type TerritorioMarcha = { id: string; dono_id: string | null; cidade_principal: boolean; x: number; y: number };

/**
 * Herói que vai na marcha, se o jogador pediu (`com_heroi`): precisa estar livre no território de origem.
 * Devolve o id e o bônus de velocidade (desbravador mais a raça; o anão anda mais devagar).
 */
function heroiDaMarcha(c: CidadeAvancada, corpo: Record<string, unknown>, origemId: string, agora: number) {
  const raca = efeitosRaca(c.carregada.raca).velocidade;
  if (corpo.com_heroi !== true) return { heroiId: null, bonusVelocidade: raca };
  const heroi = c.carregada.heroi;
  if (!heroi || heroi.territorioId !== origemId || !heroiDisponivel(heroi, agora)) {
    throw new ErroDoJogo('O herói precisa estar livre (sem treino e sem ferimento) no território de onde a marcha sai.');
  }
  return { heroiId: heroi.id, bonusVelocidade: raca + (heroi.especialidade === 'desbravador' ? bonusHeroi(heroi.nivel, 'desbravador') : 0) };
}

/** O herói sai do território e passa a viajar com a marcha recém-criada. */
async function embarcarHeroi(tx: Transacao, heroiId: string | null, marchaId: string) {
  if (heroiId) await tx`update herois set territorio_id = null, marcha_id = ${marchaId} where id = ${heroiId}`;
}

/**
 * Tira as tropas do território de origem e põe a marcha a caminho: ataque (saque ou conquista) contra um
 * vizinho, ou movimento para outro território próprio. Atacar quebra o próprio escudo; mover, não.
 */
async function enviarMarcha(
  tx: Transacao,
  temporada: Temporada,
  c: CidadeAvancada,
  corpo: Record<string, unknown>,
  agora: number,
): Promise<number> {
  const enviar = lerExercito(corpo.tropas);
  const origemId = String(corpo.origem_id ?? '');
  const destinoId = String(corpo.destino_id ?? '');
  if (![origemId, destinoId].every((id) => UUID.test(id))) throw new ErroDoJogo('Território desconhecido.');

  const territorios = await tx<TerritorioMarcha[]>`
    select id, dono_id, cidade_principal, x, y from territorios
     where temporada_id = ${temporada.id} and id in (${origemId}, ${destinoId})`;
  const origem = territorios.find((t) => t.id === origemId);
  const destino = territorios.find((t) => t.id === destinoId);
  if (!origem || !destino) throw new ErroDoJogo('Território desconhecido.');
  const grupo = c.grupos.find((g) => g.territorioId === origemId);
  const jogadorId = c.carregada.jogadorId;

  // Movimento: entre territórios próprios ligados por territórios próprios, sem batalha.
  if (corpo.tipo === 'movimento') {
    const proprios = await tx<{ id: string }[]>`select id from territorios where temporada_id = ${temporada.id} and dono_id = ${jogadorId}`;
    const fronteiras = await tx<{ territorio_a: string; territorio_b: string }[]>`
      select territorio_a, territorio_b from fronteiras where temporada_id = ${temporada.id}`;
    const v = verificarMovimento({
      enviar,
      disponiveis: grupo?.tropas ?? mapearExercito(() => 0),
      origemDoJogador: origem.dono_id === jogadorId,
      destinoDoJogador: destino.dono_id === jogadorId,
      mesmoTerritorio: origemId === destinoId,
      ligados: ligadosPorTerritoriosProprios({
        grafo: grafoDeFronteiras(fronteiras.map((f) => [f.territorio_a, f.territorio_b] as const)),
        origem: origemId,
        destino: destinoId,
        proprios: new Set(proprios.map((p) => p.id)),
      }),
    });
    if (!v.ok) throw new ErroDoJogo(MENSAGENS_MOVIMENTO[v.motivo]);
    const { heroiId, bonusVelocidade } = heroiDaMarcha(c, corpo, origemId, agora);
    grupo!.tropas = mapearExercito((t) => grupo!.tropas[t] - enviar[t]);
    // Estrada pronta na saída e na chegada: o reforço anda mais rápido.
    const estradas = await tx<{ territorio_id: string; pronto_em: Date }[]>`
      select territorio_id, pronto_em from estradas where territorio_id in (${origemId}, ${destinoId})`;
    const temEstrada = (id: string) =>
      estradaPronta(
        estradas.map((e) => ({ territorioId: e.territorio_id, prontoEm: e.pronto_em.getTime() })).find((e) => e.territorioId === id),
        agora,
      );
    const chegada = agora + duracaoMarchaMs(origem, destino, enviar, bonusVelocidade, multiplicadorEstrada(temEstrada(origemId), temEstrada(destinoId)));
    const [marcha] = await tx<{ id: string }[]>`
      insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria, partida_em, chegada_em, heroi_id)
      values (${temporada.id}, ${jogadorId}, ${origemId}, ${destinoId}, 'movimento',
              ${enviar.lanceiro}, ${enviar.arqueiro}, ${enviar.cavalaria}, ${new Date(agora)}, ${new Date(chegada)}, ${heroiId})
      returning id`;
    await embarcarHeroi(tx, heroiId, marcha!.id);
    return chegada;
  }

  const tipo = corpo.tipo as TipoAtaque;
  if (!TIPOS_ATAQUE.includes(tipo)) throw new ErroDoJogo('Tipo de ataque desconhecido.');
  if (origemId === destinoId) throw new ErroDoJogo('Território desconhecido.');

  const [fronteira] = await tx`
    select 1 from fronteiras
     where (territorio_a = ${origemId} and territorio_b = ${destinoId})
        or (territorio_a = ${destinoId} and territorio_b = ${origemId})`;
  const [escudo] = destino.dono_id
    ? await tx<{ ate: Date }[]>`
        select ate from protecoes where temporada_id = ${temporada.id} and jogador_id = ${destino.dono_id} and tipo = 'escudo'`
    : [];

  const v = verificarAtaque({
    tipo,
    enviar,
    disponiveis: grupo?.tropas ?? mapearExercito(() => 0),
    origemDoJogador: origem.dono_id === jogadorId,
    vizinhos: !!fronteira,
    alvo: { donoId: destino.dono_id, cidadePrincipal: destino.cidade_principal },
    jogadorId,
    inicioTemporada: temporada.inicio,
    escudoDoAlvoAte: escudo ? escudo.ate.getTime() : null,
    agora,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_ATAQUE[v.motivo]);
  const { heroiId, bonusVelocidade } = heroiDaMarcha(c, corpo, origemId, agora);

  grupo!.tropas = mapearExercito((t) => grupo!.tropas[t] - enviar[t]);
  const chegada = agora + duracaoMarchaMs(origem, destino, enviar, bonusVelocidade);
  const [marcha] = await tx<{ id: string }[]>`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria, partida_em, chegada_em, heroi_id)
    values (${temporada.id}, ${jogadorId}, ${origemId}, ${destinoId}, ${tipo},
            ${enviar.lanceiro}, ${enviar.arqueiro}, ${enviar.cavalaria}, ${new Date(agora)}, ${new Date(chegada)}, ${heroiId})
    returning id`;
  await embarcarHeroi(tx, heroiId, marcha!.id);
  await tx`delete from protecoes where temporada_id = ${temporada.id} and jogador_id = ${jogadorId} and tipo = 'escudo'`;
  return chegada;
}

/** Manda um batedor (custa ouro) de um território próprio para um vizinho; ele volta com as informações. */
async function enviarReconhecimento(
  tx: Transacao,
  temporada: Temporada,
  c: CidadeAvancada,
  corpo: Record<string, unknown>,
  agora: number,
): Promise<number> {
  const origemId = String(corpo.origem_id ?? '');
  const destinoId = String(corpo.destino_id ?? '');
  if (![origemId, destinoId].every((id) => UUID.test(id)) || origemId === destinoId) throw new ErroDoJogo('Território desconhecido.');
  const territorios = await tx<TerritorioMarcha[]>`
    select id, dono_id, cidade_principal, x, y from territorios
     where temporada_id = ${temporada.id} and id in (${origemId}, ${destinoId})`;
  const origem = territorios.find((t) => t.id === origemId);
  const destino = territorios.find((t) => t.id === destinoId);
  if (!origem || !destino) throw new ErroDoJogo('Território desconhecido.');
  const [fronteira] = await tx`
    select 1 from fronteiras
     where (territorio_a = ${origemId} and territorio_b = ${destinoId})
        or (territorio_a = ${destinoId} and territorio_b = ${origemId})`;

  const jogadorId = c.carregada.jogadorId;
  const v = verificarReconhecimento({
    origemDoJogador: origem.dono_id === jogadorId,
    vizinhos: !!fronteira,
    alvoProprio: destino.dono_id === jogadorId,
    ouro: c.estado.recursos.ouro,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_RECONHECIMENTO[v.motivo]);

  c.estado = { ...c.estado, recursos: { ...c.estado.recursos, ouro: c.estado.recursos.ouro - v.custoOuro } };
  const chegada = agora + duracaoReconhecimentoMs(origem, destino);
  await tx`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, partida_em, chegada_em)
    values (${temporada.id}, ${jogadorId}, ${origemId}, ${destinoId}, 'reconhecimento', ${new Date(agora)}, ${new Date(chegada)})`;
  return chegada;
}

/** Constrói uma estrutura num território do jogador; fica pronta em `pronto_em` e não usa a fila de obras. */
async function construirEstrutura(
  tx: Transacao,
  temporada: Temporada,
  c: CidadeAvancada,
  corpo: Record<string, unknown>,
  agora: number,
): Promise<number> {
  const tipo = corpo.tipo as TipoEstrutura;
  const territorioId = String(corpo.territorio_id ?? '');
  if (!TIPOS_ESTRUTURA.includes(tipo)) throw new ErroDoJogo('Estrutura desconhecida.');
  if (!UUID.test(territorioId)) throw new ErroDoJogo('Território desconhecido.');
  const [territorio] = await tx<{ dono_id: string | null }[]>`
    select dono_id from territorios where temporada_id = ${temporada.id} and id = ${territorioId}`;
  if (!territorio) throw new ErroDoJogo('Território desconhecido.');
  const [existente] = await tx`select 1 from estruturas where territorio_id = ${territorioId}`;

  const v = verificarEstrutura({
    tipo,
    territorioDoJogador: territorio.dono_id === c.carregada.jogadorId,
    jaTemEstrutura: !!existente,
    recursos: c.estado.recursos,
    agora,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_ESTRUTURA[v.motivo]);

  c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
  await tx`
    insert into estruturas (temporada_id, territorio_id, jogador_id, tipo, pronto_em)
    values (${temporada.id}, ${territorioId}, ${c.carregada.jogadorId}, ${tipo}, ${new Date(v.prontoEm)})`;
  return v.prontoEm;
}

/** Faz uma estrada num território do jogador (à parte da estrutura; uma por território). */
async function construirEstrada(
  tx: Transacao,
  temporada: Temporada,
  c: CidadeAvancada,
  corpo: Record<string, unknown>,
  agora: number,
): Promise<number> {
  const territorioId = String(corpo.territorio_id ?? '');
  if (!UUID.test(territorioId)) throw new ErroDoJogo('Território desconhecido.');
  const [territorio] = await tx<{ dono_id: string | null }[]>`
    select dono_id from territorios where temporada_id = ${temporada.id} and id = ${territorioId}`;
  if (!territorio) throw new ErroDoJogo('Território desconhecido.');
  const [existente] = await tx`select 1 from estradas where territorio_id = ${territorioId}`;

  const v = verificarEstrada({
    territorioDoJogador: territorio.dono_id === c.carregada.jogadorId,
    jaTemEstrada: !!existente,
    recursos: c.estado.recursos,
    agora,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_ESTRADA[v.motivo]);

  c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
  await tx`
    insert into estradas (temporada_id, territorio_id, jogador_id, pronto_em)
    values (${temporada.id}, ${territorioId}, ${c.carregada.jogadorId}, ${new Date(v.prontoEm)})`;
  return v.prontoEm;
}

/** Pega a recompensa de uma missão de início cumprida (uma vez por missão na temporada). */
async function resgatarMissao(tx: Transacao, temporada: Temporada, c: CidadeAvancada, corpo: Record<string, unknown>) {
  const jogadorId = c.carregada.jogadorId;
  const [linha] = await tx<{ missoes: string[]; territorios: number; batedores: number; construcoes: number }[]>`
    select ci.missoes,
           (select count(*) from territorios where temporada_id = ${temporada.id} and dono_id = ${jogadorId})::int as territorios,
           (select count(*) from marchas
             where temporada_id = ${temporada.id} and jogador_id = ${jogadorId} and tipo = 'reconhecimento')::int as batedores,
           ((select count(*) from estruturas where temporada_id = ${temporada.id} and jogador_id = ${jogadorId})
            + (select count(*) from estradas where temporada_id = ${temporada.id} and jogador_id = ${jogadorId}))::int as construcoes
      from cidades ci where ci.id = ${c.carregada.id}`;
  const v = verificarResgateMissao({
    missao: String(corpo.missao ?? ''),
    resgatadas: linha!.missoes,
    situacao: {
      predios: c.estado.predios,
      soldados: totalUnidades(c.tropasTotais),
      territorios: linha!.territorios,
      batedores: linha!.batedores,
      construcoes: linha!.construcoes,
      temHeroi: !!c.carregada.heroi,
    },
    recursos: c.estado.recursos,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_MISSAO[v.motivo]);
  c.estado = { ...c.estado, recursos: v.recursos };
  await tx`update cidades set missoes = array_append(missoes, ${v.missao}) where id = ${c.carregada.id}`;
  return v.missao;
}

/** Recruta o herói do jogador na cidade (um por temporada; ocupa 1 de população). */
async function recrutarHeroi(tx: Transacao, temporada: Temporada, c: CidadeAvancada, corpo: Record<string, unknown>) {
  if (!c.carregada.territorioId) throw new ErroDoJogo('Sua cidade não tem território nesta temporada.', 409);
  const v = verificarRecrutamento({
    jaTemHeroi: !!c.carregada.heroi,
    nivelQuartel: c.estado.predios.quartel,
    habitantesLivres: habitantesLivres(c.estado, soldados(c)),
    recursos: c.estado.recursos,
    nome: String(corpo.nome ?? ''),
    especialidade: String(corpo.especialidade ?? ''),
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_RECRUTAMENTO[v.motivo]);
  c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
  await tx`
    insert into herois (temporada_id, jogador_id, nome, especialidade, territorio_id)
    values (${temporada.id}, ${c.carregada.jogadorId}, ${v.nome}, ${v.especialidade}, ${c.carregada.territorioId})`;
}

/** Começa o treino do herói: o nível sobe agora, mas ele fica ocupado na cidade até o fim. */
async function treinarHeroi(tx: Transacao, c: CidadeAvancada, agora: number): Promise<number> {
  const heroi = c.carregada.heroi;
  const v = verificarTreinoHeroi({ heroi, cidadeTerritorioId: c.carregada.territorioId, recursos: c.estado.recursos, agora });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_TREINO_HEROI[v.motivo]);
  c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
  await tx`update herois set nivel = ${v.nivelAlvo}, treino_pronto_em = ${new Date(v.prontoEm)} where id = ${heroi!.id}`;
  return v.prontoEm;
}

/** Sobe um nível da vila do jogador (mais população máxima na cidade). Devolve o novo nível. */
async function melhorarVila(tx: Transacao, temporada: Temporada, c: CidadeAvancada, corpo: Record<string, unknown>): Promise<number> {
  const territorioId = String(corpo.territorio_id ?? '');
  if (!UUID.test(territorioId)) throw new ErroDoJogo('Território desconhecido.');
  const [linha] = await tx<{ id: string; tipo: TipoPovoado; nivel: number; dono_id: string | null }[]>`
    select p.id, p.tipo, p.nivel, t.dono_id
      from povoados p join territorios t on t.id = p.territorio_id
     where t.temporada_id = ${temporada.id} and t.id = ${territorioId}
       for update of p`;

  const v = verificarMelhoriaVila({
    povoado: linha ?? null,
    doJogador: linha?.dono_id === c.carregada.jogadorId,
    recursos: c.estado.recursos,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_VILA[v.motivo]);

  c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
  await tx`update povoados set nivel = ${v.nivelAlvo} where id = ${linha!.id}`;
  return v.nivelAlvo;
}

async function executar(jogadorId: string, corpo: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (corpo.acao === 'entrar') {
    // Funda a cidade (se ainda não houver) e sorteia o objetivo secreto (se ainda não houver).
    await sql.begin(async (tx) => {
      await criarCidade(tx, jogadorId, { raca: corpo.raca, nome: corpo.nome });
      await garantirObjetivo(tx, (await temporadaAtiva(tx)).id, jogadorId);
    });
    return { ok: true };
  }
  if (corpo.acao === 'salvar_perfil') {
    // O perfil é do jogador, não da cidade: muda a qualquer hora, com ou sem temporada em andamento.
    const perfil = await sql.begin((tx) => salvarPerfil(tx, jogadorId, corpo));
    return { ok: true, ...perfil };
  }
  if (corpo.acao === 'marcar_relatorios_lidos') {
    await sql`update relatorios set lido_atacante = true where atacante_id = ${jogadorId} and not lido_atacante`;
    await sql`update relatorios set lido_defensor = true where defensor_id = ${jogadorId} and not lido_defensor`;
    await sql`update reconhecimentos set lido = true where jogador_id = ${jogadorId} and not lido and disponivel_em <= now()`;
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
      case 'cancelar_obra': {
        // O item é achado pelo horário de fim que o jogador viu; se a fila mudou nesse meio-tempo, recusa.
        const obras = [...c.obras].sort((a, b) => a.prontoEm - b.prontoEm);
        const prontoEm = Date.parse(String(corpo.pronto_em ?? ''));
        const v = cancelarObra({ predios: c.estado.predios, obras, indice: obras.findIndex((o) => o.prontoEm === prontoEm), agora });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_CANCELAMENTO[v.motivo]);
        c.obras = v.obras;
        c.estado = { ...c.estado, recursos: somarRecursos(c.estado.recursos, v.devolver) };
        resultado.canceladas = v.canceladas;
        break;
      }
      case 'cancelar_treino': {
        const fila = [...c.fila].sort((a, b) => a.prontoEm - b.prontoEm);
        const prontoEm = Date.parse(String(corpo.pronto_em ?? ''));
        const v = cancelarTreino({ fila, indice: fila.findIndex((l) => l.prontoEm === prontoEm), agora });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_CANCELAMENTO[v.motivo]);
        c.fila = v.fila;
        c.estado = { ...c.estado, recursos: somarRecursos(c.estado.recursos, v.devolver) };
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
      case 'enviar_reconhecimento': {
        resultado.chegada_em = new Date(await enviarReconhecimento(tx, temporada, c, corpo, agora)).toISOString();
        break;
      }
      case 'construir_estrutura': {
        resultado.pronto_em = new Date(await construirEstrutura(tx, temporada, c, corpo, agora)).toISOString();
        break;
      }
      case 'construir_estrada': {
        resultado.pronto_em = new Date(await construirEstrada(tx, temporada, c, corpo, agora)).toISOString();
        break;
      }
      case 'resgatar_missao': {
        resultado.missao = await resgatarMissao(tx, temporada, c, corpo);
        break;
      }
      case 'melhorar_vila': {
        resultado.nivel = await melhorarVila(tx, temporada, c, corpo);
        break;
      }
      case 'recrutar_heroi': {
        await recrutarHeroi(tx, temporada, c, corpo);
        break;
      }
      case 'treinar_heroi': {
        resultado.pronto_em = new Date(await treinarHeroi(tx, c, agora)).toISOString();
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
