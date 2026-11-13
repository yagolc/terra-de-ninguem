// Edge Function `cidade`: comandos do jogador, validados com o pacote de regras.
// Corpo: { acao: 'entrar', raca, nome? } (funda a cidade, se ainda não houver, e sorteia o objetivo) | { acao: 'evoluir_predio', tipo } | { acao: 'alocar_trabalhadores', alocacao }
//      | { acao: 'treinar_tropas', tipo, quantidade, territorio_id? } (territorio_id: acampamento militar onde fica pronto)
//      | { acao: 'enviar_marcha', origem_id, destino_id, tipo: 'saque' | 'conquista' | 'movimento', tropas }
//      | { acao: 'enviar_reconhecimento', origem_id, destino_id }
//      | { acao: 'construir_estrutura', territorio_id, tipo: 'torre' | 'palicada' | 'entreposto' | 'acampamento' }
//      | { acao: 'destruir_estrutura', territorio_id } (sem devolver nada; abre espaço para outra)
//      | { acao: 'construir_estrada', territorio_id }
//      | { acao: 'resgatar_missao', missao }
//      | { acao: 'cancelar_obra', pronto_em } | { acao: 'cancelar_treino', pronto_em } (devolvem tudo; pronto_em identifica o item)
//      | { acao: 'melhorar_vila', territorio_id }
//      | { acao: 'recrutar_heroi', nome, especialidade } | { acao: 'treinar_heroi' }
//      | { acao: 'salvar_perfil', nome, cor, cor_secundaria, padrao, emblema, descricao } (não precisa de temporada ativa)
//      (enviar_marcha aceita com_heroi: true para levar o herói, que precisa estar livre na origem)
//      | { acao: 'enviar_carta', destinatario_id, texto, proposta?: 'nao_agressao' | 'acesso_militar', horas_pacto? } (precisa de Pombal)
//      | { acao: 'responder_pacto', carta_id, aceitar }
//      | { acao: 'marcar_relatorios_lidos' } | { acao: 'marcar_cartas_lidas' }
//      | { acao: 'inscrever_avisos', inscricao, tipos } | { acao: 'cancelar_avisos', endpoint } | { acao: 'testar_avisos', endpoint }
//        (avisos no celular deste aparelho; não precisam de temporada ativa)
//      | { acao: 'pedir_gemas', gemas } | { acao: 'cancelar_pedido_gemas', codigo } (loja; não precisam de temporada ativa)
//      | { acao: 'comprar_item', item, variante?, pedido? } | { acao: 'usar_titulo', titulo } (loja; sem temporada, menos itens de temporada)
//      | { acao: 'enviar_reporte', tipo, area, titulo, descricao?, gravidade?, passos?, esperado?, aconteceu?, contexto }
//      | { acao: 'votar_reporte', reporte_id } | { acao: 'atualizar_reporte', reporte_id, status, resposta } (só organizador)
//      | { acao: 'escolher_pet', tipo } | { acao: 'pedir_resgate', dono_id, ouro } | { acao: 'libertar_pet', dono_id } | { acao: 'pagar_resgate' }
//      | { acao: 'publicar_arauto', texto } | { acao: 'presentear_gemas', destinatario_id, gemas }
//      | { acao: 'terminar_obra', pronto_em } (gasta gemas para terminar na hora a obra que está sendo feita)
// Publicar com: npx supabase functions deploy cidade --no-verify-jwt (o token é validado no código).
import {
  MENSAGENS_ALOCACAO,
  MENSAGENS_ATAQUE,
  MENSAGENS_CARTA,
  MENSAGENS_DESTRUICAO,
  MENSAGENS_INSCRICAO_AVISOS,
  MENSAGENS_CANCELAMENTO,
  MENSAGENS_ESTRADA,
  MENSAGENS_ESTRUTURA,
  MENSAGENS_EVOLUCAO,
  MENSAGENS_MISSAO,
  MENSAGENS_MOVIMENTO,
  MENSAGENS_RECONHECIMENTO,
  MENSAGENS_RECRUTAMENTO,
  MENSAGENS_RESPOSTA_PACTO,
  MENSAGENS_TERMINAR_OBRA,
  MENSAGENS_TREINO,
  MENSAGENS_TREINO_HEROI,
  MENSAGENS_VILA,
  TIPOS_ATAQUE,
  TIPOS_ESTRUTURA,
  TIPOS_PREDIO,
  TIPOS_UNIDADE,
  alcancaOAlvo,
  bonusHeroi,
  cancelarObra,
  cancelarTreino,
  duracaoMarchaMs,
  duracaoVooMs,
  efeitosRaca,
  duracaoReconhecimentoMs,
  estradaPronta,
  habitantesLivres,
  heroiDisponivel,
  ligadosPorTerritoriosProprios,
  mapearExercito,
  multiplicadorEstrada,
  pacoteValido,
  precoPacoteReais,
  somarRecursos,
  subtrairRecursos,
  terminarObraAgora,
  totalUnidades,
  BALANCEAMENTO,
  verificarAlocacao,
  verificarAtaque,
  verificarCarta,
  verificarDestruicaoEstrutura,
  verificarInscricaoAvisos,
  verificarEstrada,
  verificarEstrutura,
  verificarEvolucao,
  verificarMelhoriaVila,
  verificarMovimento,
  verificarReconhecimento,
  verificarRecrutamento,
  verificarResgateMissao,
  verificarRespostaPacto,
  verificarTreinoHeroi,
  verificarTreino,
  type Recursos,
  type TipoAtaque,
  type TipoEstrutura,
  type TipoPovoado,
  type TipoPredio,
  type TipoProposta,
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
import { comprarItem, presentearGemas, publicarArauto, usarTitulo } from '../_compartilhado/loja.ts';
import { escolherPet, libertarPet, pagarResgate, pedirResgate } from '../_compartilhado/pets.ts';
import { atualizarReporte, enviarReporte, votarReporte } from '../_compartilhado/reportes.ts';
import { salvarPerfil } from '../_compartilhado/perfil.ts';
import { fimDoPacto, terrasParaMarchar } from '../_compartilhado/pombos.ts';
import { testarAviso } from '../_compartilhado/avisos.ts';
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

  // Movimento: entre territórios próprios ligados por territórios próprios (ou de quem deu acesso militar), sem batalha.
  if (corpo.tipo === 'movimento') {
    const terras = await terrasParaMarchar(tx, temporada.id, jogadorId, agora);
    const v = verificarMovimento({
      enviar,
      disponiveis: grupo?.tropas ?? mapearExercito(() => 0),
      origemDoJogador: origem.dono_id === jogadorId,
      destinoDoJogador: destino.dono_id === jogadorId,
      mesmoTerritorio: origemId === destinoId,
      ligados: ligadosPorTerritoriosProprios({ ...terras, origem: origemId, destino: destinoId }),
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

  // Vizinho da origem ou, com acesso militar, vizinho das terras de quem deu o acesso (menos as do dono do alvo).
  const terras = await terrasParaMarchar(tx, temporada.id, jogadorId, agora, destino.dono_id);
  const alcanca = alcancaOAlvo({ ...terras, origem: origemId, alvo: destinoId });
  const [escudo] = destino.dono_id
    ? await tx<{ ate: Date }[]>`
        select ate from protecoes where temporada_id = ${temporada.id} and jogador_id = ${destino.dono_id} and tipo = 'escudo'`
    : [];

  const v = verificarAtaque({
    tipo,
    enviar,
    disponiveis: grupo?.tropas ?? mapearExercito(() => 0),
    origemDoJogador: origem.dono_id === jogadorId,
    vizinhos: alcanca,
    alvo: { donoId: destino.dono_id, cidadePrincipal: destino.cidade_principal },
    jogadorId,
    inicioTemporada: temporada.inicio,
    escudoDoAlvoAte: escudo ? escudo.ate.getTime() : null,
    pactoComAlvoAte: destino.dono_id ? await fimDoPacto(tx, temporada.id, jogadorId, destino.dono_id, agora) : null,
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

/**
 * Destrói a estrutura (pronta ou em obra) de um território do jogador, sem devolver nada, para dar lugar a outra.
 * Se era um acampamento militar, os lotes que ficariam prontos nele passam a ficar prontos na cidade.
 */
async function destruirEstrutura(tx: Transacao, temporada: Temporada, c: CidadeAvancada, corpo: Record<string, unknown>) {
  const territorioId = String(corpo.territorio_id ?? '');
  if (!UUID.test(territorioId)) throw new ErroDoJogo('Território desconhecido.');
  const jogadorId = c.carregada.jogadorId;
  const [territorio] = await tx<{ dono_id: string | null }[]>`
    select dono_id from territorios where temporada_id = ${temporada.id} and id = ${territorioId}`;
  const [estrutura] = await tx<{ id: string; tipo: TipoEstrutura; jogador_id: string }[]>`
    select id, tipo, jogador_id from estruturas where territorio_id = ${territorioId} for update`;
  const v = verificarDestruicaoEstrutura({
    territorioDoJogador: territorio?.dono_id === jogadorId,
    estruturaDoJogador: estrutura?.jogador_id === jogadorId,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_DESTRUICAO[v.motivo]);
  await tx`delete from estruturas where id = ${estrutura!.id}`;
  if (estrutura!.tipo === 'acampamento') {
    await tx`update filas_treino set territorio_id = null where cidade_id = ${c.carregada.id} and territorio_id = ${territorioId}`;
    for (const lote of c.fila) if (lote.territorioId === territorioId) lote.territorioId = null;
  }
  return estrutura!.tipo;
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

  const jogadorId = c.carregada.jogadorId;
  // Como o ataque: vizinho da origem ou, com acesso militar, das terras de quem deu o acesso.
  const terras = await terrasParaMarchar(tx, temporada.id, jogadorId, agora, destino.dono_id);
  const alcanca = alcancaOAlvo({ ...terras, origem: origemId, alvo: destinoId });
  const v = verificarReconhecimento({
    origemDoJogador: origem.dono_id === jogadorId,
    vizinhos: alcanca,
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
  const [territorio] = await tx<{ dono_id: string | null; cidade_principal: boolean }[]>`
    select dono_id, cidade_principal from territorios where temporada_id = ${temporada.id} and id = ${territorioId}`;
  if (!territorio) throw new ErroDoJogo('Território desconhecido.');
  const [existente] = await tx`select 1 from estruturas where territorio_id = ${territorioId}`;
  const [acampamentos] = await tx<{ n: number }[]>`
    select count(*)::int as n from estruturas
     where temporada_id = ${temporada.id} and jogador_id = ${c.carregada.jogadorId} and tipo = 'acampamento'`;

  const v = verificarEstrutura({
    tipo,
    territorioDoJogador: territorio.dono_id === c.carregada.jogadorId,
    jaTemEstrutura: !!existente,
    recursos: c.estado.recursos,
    agora,
    cidadePrincipal: territorio.cidade_principal,
    acampamentosDoJogador: acampamentos?.n ?? 0,
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
  const v = verificarTreinoHeroi({ heroi, recursos: c.estado.recursos, agora });
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

/** Manda uma carta (com ou sem proposta de pacto): o pombo sai da cidade do jogador e voa até a do destinatário. */
async function enviarCarta(tx: Transacao, temporada: Temporada, c: CidadeAvancada, corpo: Record<string, unknown>, agora: number): Promise<number> {
  const jogadorId = c.carregada.jogadorId;
  const destinatarioId = String(corpo.destinatario_id ?? '');
  if (!UUID.test(destinatarioId)) throw new ErroDoJogo(MENSAGENS_CARTA.destinatario_invalido);
  const cidades = await tx<{ jogador_id: string; x: number; y: number }[]>`
    select c.jogador_id, t.x, t.y from cidades c join territorios t on t.id = c.territorio_id
     where c.temporada_id = ${temporada.id} and c.jogador_id in (${jogadorId}, ${destinatarioId})`;
  const origem = cidades.find((l) => l.jogador_id === jogadorId);
  const destino = cidades.find((l) => l.jogador_id === destinatarioId);
  // A cidade do jogador está travada (carregarCidade), então dois envios juntos não passam do limite de pombos.
  const [voando] = await tx<{ n: number }[]>`
    select count(*)::int as n from cartas where remetente_id = ${jogadorId} and chega_em > ${new Date(agora)}`;
  const nivelPombal = c.estado.predios.pombal;
  const v = verificarCarta({
    nivelPombal,
    emVoo: voando?.n ?? 0,
    remetenteId: jogadorId,
    destinatarioId,
    destinatarioNaTemporada: !!destino && destinatarioId !== jogadorId,
    texto: corpo.texto,
    proposta: corpo.proposta,
    horasPacto: corpo.horas_pacto,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_CARTA[v.motivo]);
  if (!origem || !destino) throw new ErroDoJogo('Sua cidade não tem território nesta temporada.', 409);
  const chegada = agora + duracaoVooMs(origem, destino, nivelPombal);
  await tx`
    insert into cartas (temporada_id, remetente_id, destinatario_id, texto, proposta, horas_pacto, enviada_em, chega_em)
    values (${temporada.id}, ${jogadorId}, ${destinatarioId}, ${v.texto}, ${v.proposta}, ${v.horasPacto},
            ${new Date(agora)}, ${new Date(chegada)})`;
  return chegada;
}

/** Aceita ou recusa a proposta de pacto de uma carta recebida. Aceito, o pacto vale a partir de agora. */
async function responderPacto(tx: Transacao, temporada: Temporada, jogadorId: string, corpo: Record<string, unknown>, agora: number) {
  const cartaId = String(corpo.carta_id ?? '');
  if (!UUID.test(cartaId)) throw new ErroDoJogo(MENSAGENS_RESPOSTA_PACTO.sem_proposta);
  const [carta] = await tx<
    {
      remetente_id: string;
      destinatario_id: string;
      proposta: TipoProposta | null;
      horas_pacto: number | null;
      chega_em: Date;
      resposta: string | null;
    }[]
  >`
    select remetente_id, destinatario_id, proposta, horas_pacto, chega_em, resposta from cartas
     where id = ${cartaId} and temporada_id = ${temporada.id} for update`;
  if (!carta) throw new ErroDoJogo(MENSAGENS_RESPOSTA_PACTO.sem_proposta);
  const aceitar = corpo.aceitar === true;
  // Quem está segurando o objetivo cumprido não fica protegido por pacto de não agressão (nem fecha um novo).
  const [segurando] = await tx<{ n: number }[]>`
    select count(*)::int as n from placar
     where temporada_id = ${temporada.id} and objetivo_desde is not null
       and jogador_id in (${carta.remetente_id}, ${carta.destinatario_id})`;
  const v = verificarRespostaPacto({
    carta: {
      destinatarioId: carta.destinatario_id,
      proposta: carta.proposta,
      horasPacto: carta.horas_pacto,
      chegaEm: carta.chega_em.getTime(),
      respondida: carta.resposta !== null,
    },
    jogadorId,
    aceitar,
    agora,
    objetivoEmJogo: (segurando?.n ?? 0) > 0,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_RESPOSTA_PACTO[v.motivo]);
  await tx`
    update cartas set resposta = ${aceitar ? 'aceita' : 'recusada'}, respondida_em = ${new Date(agora)},
                      pacto_ate = ${v.pactoAte === null ? null : new Date(v.pactoAte)}
     where id = ${cartaId}`;
  return v.pactoAte;
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
  if (corpo.acao === 'inscrever_avisos') {
    // Aparelho que ativa (ou muda os tipos de) avisos no celular. O mesmo aparelho passa a ser de quem entrou nele.
    const v = verificarInscricaoAvisos({ inscricao: corpo.inscricao, tipos: corpo.tipos });
    if (!v.ok) throw new ErroDoJogo(MENSAGENS_INSCRICAO_AVISOS[v.motivo]);
    await sql.begin(async (tx) => {
      await tx`
        insert into inscricoes_avisos (jogador_id, endpoint, p256dh, auth, tipos)
        values (${jogadorId}, ${v.endpoint}, ${v.p256dh}, ${v.auth}, ${v.tipos}::text[])
        on conflict (endpoint) do update
          set jogador_id = excluded.jogador_id, p256dh = excluded.p256dh, auth = excluded.auth, tipos = excluded.tipos,
              atualizado_em = now()`;
      // No máximo 10 aparelhos por jogador: os mais antigos saem.
      await tx`
        delete from inscricoes_avisos where jogador_id = ${jogadorId} and id not in (
          select id from inscricoes_avisos where jogador_id = ${jogadorId} order by atualizado_em desc limit 10)`;
    });
    return { ok: true, tipos: v.tipos };
  }
  if (corpo.acao === 'cancelar_avisos') {
    await sql`delete from inscricoes_avisos where jogador_id = ${jogadorId} and endpoint = ${String(corpo.endpoint ?? '')}`;
    return { ok: true };
  }
  if (corpo.acao === 'testar_avisos') {
    const r = await testarAviso(jogadorId, String(corpo.endpoint ?? ''));
    if (!r.ok) {
      throw new ErroDoJogo(
        r.codigo === 404
          ? 'Este aparelho não está inscrito. Ative os avisos de novo.'
          : `O serviço de avisos do navegador recusou o envio${r.codigo ? ` (código ${r.codigo})` : ''}. Tente desativar e ativar de novo.`,
      );
    }
    return { ok: true };
  }
  if (corpo.acao === 'pedir_gemas') {
    // Pedido de um pacote: o código vai no Pix e o organizador confirma quando o pagamento cair.
    if (!pacoteValido(corpo.gemas)) throw new ErroDoJogo('Pacote de gemas desconhecido.');
    const gemas = corpo.gemas;
    const pedido = await sql.begin(async (tx) => {
      await tx`select id from jogadores where id = ${jogadorId} for update`;
      const [{ pendentes } = { pendentes: 0 }] = await tx<{ pendentes: number }[]>`
        select count(*)::int as pendentes from pedidos_gemas where jogador_id = ${jogadorId} and status = 'pendente'`;
      const maximo = BALANCEAMENTO.loja.pedidosPendentesMaximo;
      if (pendentes >= maximo) {
        throw new ErroDoJogo(`Você já tem ${maximo} pedidos esperando o Pix ser conferido. Cancele um ou espere a confirmação.`);
      }
      const [linha] = await tx<{ codigo: string; valor_centavos: number }[]>`
        insert into pedidos_gemas (jogador_id, gemas, valor_centavos)
        values (${jogadorId}, ${gemas}, ${Math.round(precoPacoteReais(gemas) * 100)})
        returning codigo, valor_centavos`;
      return linha!;
    });
    return { ok: true, ...pedido };
  }
  if (corpo.acao === 'comprar_item') {
    return { ok: true, ...(await sql.begin((tx) => comprarItem(tx, jogadorId, corpo))) };
  }
  if (corpo.acao === 'enviar_reporte') {
    return { ok: true, ...(await sql.begin((tx) => enviarReporte(tx, jogadorId, corpo))) };
  }
  if (corpo.acao === 'votar_reporte') {
    return { ok: true, ...(await sql.begin((tx) => votarReporte(tx, jogadorId, corpo.reporte_id))) };
  }
  if (corpo.acao === 'atualizar_reporte') {
    return { ok: true, ...(await sql.begin((tx) => atualizarReporte(tx, jogadorId, corpo))) };
  }
  if (corpo.acao === 'escolher_pet') {
    return { ok: true, ...(await sql.begin((tx) => escolherPet(tx, jogadorId, corpo.tipo))) };
  }
  if (corpo.acao === 'pedir_resgate') {
    return { ok: true, ...(await sql.begin((tx) => pedirResgate(tx, jogadorId, corpo.dono_id, corpo.ouro))) };
  }
  if (corpo.acao === 'libertar_pet') {
    return { ok: true, ...(await sql.begin((tx) => libertarPet(tx, jogadorId, corpo.dono_id))) };
  }
  if (corpo.acao === 'pagar_resgate') {
    return { ok: true, ...(await sql.begin((tx) => pagarResgate(tx, jogadorId))) };
  }
  if (corpo.acao === 'publicar_arauto') {
    return { ok: true, ...(await sql.begin((tx) => publicarArauto(tx, jogadorId, corpo.texto))) };
  }
  if (corpo.acao === 'presentear_gemas') {
    return { ok: true, ...(await sql.begin((tx) => presentearGemas(tx, jogadorId, corpo.destinatario_id, corpo.gemas))) };
  }
  if (corpo.acao === 'usar_titulo') {
    return { ok: true, ...(await sql.begin((tx) => usarTitulo(tx, jogadorId, corpo.titulo))) };
  }
  if (corpo.acao === 'cancelar_pedido_gemas') {
    const linhas = await sql`
      update pedidos_gemas set status = 'cancelado'
       where jogador_id = ${jogadorId} and codigo = ${String(corpo.codigo ?? '')} and status = 'pendente'
       returning id`;
    if (linhas.length === 0) throw new ErroDoJogo('Esse pedido não está mais esperando pagamento.');
    return { ok: true };
  }
  if (corpo.acao === 'marcar_cartas_lidas') {
    await sql`update cartas set lida = true where destinatario_id = ${jogadorId} and not lida and chega_em <= now()`;
    await sql`update cartas set resposta_vista = true where remetente_id = ${jogadorId} and resposta is not null and not resposta_vista`;
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
      case 'terminar_obra': {
        // A trava da cidade (carregarCidade) já impede dois usos ao mesmo tempo; o saldo também é travado.
        const [saldo] = await tx<{ saldo: number }[]>`select saldo from gemas where jogador_id = ${jogadorId} for update`;
        const [{ usos } = { usos: 0 }] = await tx<{ usos: number }[]>`
          select count(*)::int as usos from usos_gemas where temporada_id = ${temporada.id} and jogador_id = ${jogadorId}`;
        const v = terminarObraAgora({
          predios: c.estado.predios,
          obras: [...c.obras].sort((a, b) => a.prontoEm - b.prontoEm),
          prontoEm: Date.parse(String(corpo.pronto_em ?? '')),
          gemas: saldo?.saldo ?? 0,
          usos,
          agora,
        });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_TERMINAR_OBRA[v.motivo]);
        c.obras = v.obras;
        c.estado = { ...c.estado, predios: { ...c.estado.predios, [v.tipo]: v.nivelAlvo } };
        await tx`update gemas set saldo = saldo - ${v.preco}, atualizado_em = now() where jogador_id = ${jogadorId}`;
        await tx`
          insert into usos_gemas (temporada_id, jogador_id, tipo, predio, nivel, gemas)
          values (${temporada.id}, ${jogadorId}, 'terminar_obra', ${v.tipo}, ${v.nivelAlvo}, ${v.preco})`;
        resultado.predio = v.tipo;
        resultado.nivel = v.nivelAlvo;
        resultado.gemas_gastas = v.preco;
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
        // Pronto num acampamento militar: território do jogador com o acampamento dele já construído.
        const acampamentoId = corpo.territorio_id ? String(corpo.territorio_id) : null;
        if (acampamentoId && !UUID.test(acampamentoId)) throw new ErroDoJogo('Território desconhecido.');
        const [acampamento] = acampamentoId
          ? await tx<{ ok: boolean }[]>`
              select true as ok from estruturas e join territorios t on t.id = e.territorio_id
               where e.territorio_id = ${acampamentoId} and e.tipo = 'acampamento' and e.jogador_id = ${jogadorId}
                 and e.pronto_em <= ${new Date(agora)} and t.dono_id = ${jogadorId}`
          : [];
        const v = verificarTreino({
          cidade: c.estado,
          tipo,
          quantidade,
          soldados: soldados(c),
          fila: c.fila,
          agora,
          ...(acampamentoId ? { noAcampamento: { pronto: !!acampamento } } : {}),
        });
        if (!v.ok) throw new ErroDoJogo(MENSAGENS_TREINO[v.motivo]);
        c.estado = { ...c.estado, recursos: subtrairRecursos(c.estado.recursos, v.custo) };
        c.novoLote = { tipo, quantidade, prontoEm: v.prontoEm, territorioId: acampamentoId };
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
      case 'destruir_estrutura': {
        resultado.tipo = await destruirEstrutura(tx, temporada, c, corpo);
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
      case 'enviar_carta': {
        resultado.chega_em = new Date(await enviarCarta(tx, temporada, c, corpo, agora)).toISOString();
        break;
      }
      case 'responder_pacto': {
        const ate = await responderPacto(tx, temporada, jogadorId, corpo, agora);
        resultado.pacto_ate = ate === null ? null : new Date(ate).toISOString();
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
