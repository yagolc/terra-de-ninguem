// Edge Function `resolver-marchas`: chamada a cada minuto pelo pg_cron (migration 0007).
// Resolve as marchas que já chegaram: batalha, perdas, saque, conquista, escudo e relatório;
// e entrega as tropas (e o saque) das marchas de volta. Cada marcha numa transação própria.
// Depois resolve e solta as hordas bárbaras (hordas.ts), atualiza o placar e encerra a temporada se alguém
// cumpriu o objetivo ou o prazo acabou.
// Publicar com: npx supabase functions deploy resolver-marchas --no-verify-jwt
// Exige o cabeçalho x-segredo-cron igual à variável SEGREDO_CRON (npx supabase secrets set).
import {
  BALANCEAMENTO,
  bonusDefesaRaca,
  bonusHeroi,
  bonusSeDisponivel,
  calcularSaque,
  distribuirPerdas,
  duracaoMarchaMs,
  duracaoReconhecimentoMs,
  efeitosRaca,
  escudoAte,
  exercito,
  feridoAte,
  fimProtecaoIniciante,
  geradorComSemente,
  lealDesdeNaConquista,
  mapearExercito,
  receberSaque,
  recursos,
  resolverBatalha,
  saquearVilaDeJogador,
  saquearVilaNeutra,
  sementeDeTexto,
  somarExercitos,
  sortearSorte,
  subtrairRecursos,
  totalUnidades,
  type Exercito,
  type Recursos,
  type Terreno,
  type TipoPovoado,
} from '../../../packages/regras/src/index.ts';
import { avancarAteAgora, carregarCidade, grupoEm, salvarCidade, type CidadeAvancada } from '../_compartilhado/cidade.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { heroiNoRelatorio, heroiNoTerritorio, posicionarHeroi, type HeroiSalvo } from '../_compartilhado/herois.ts';
import { atualizarPlacar } from '../_compartilhado/objetivos.ts';
import { fimDoPacto } from '../_compartilhado/pombos.ts';
import { resposta } from '../_compartilhado/http.ts';
import { cuidarDasHordas } from './hordas.ts';

type Marcha = {
  id: string;
  temporada_id: string;
  jogador_id: string;
  origem_id: string;
  destino_id: string;
  tipo: 'saque' | 'conquista' | 'retorno' | 'movimento' | 'reconhecimento';
  lanceiro: number;
  arqueiro: number;
  cavalaria: number;
  saque_comida: number;
  saque_madeira: number;
  saque_ouro: number;
  heroi_id: string | null;
};

type Territorio = { id: string; dono_id: string | null; cidade_principal: boolean; terreno: Terreno; x: number; y: number };

const tropasDa = (m: Marcha): Exercito => exercito({ lanceiro: m.lanceiro, arqueiro: m.arqueiro, cavalaria: m.cavalaria });

async function territorio(tx: Transacao, id: string): Promise<Territorio> {
  const [t] = await tx<Territorio[]>`select id, dono_id, cidade_principal, terreno, x, y from territorios where id = ${id} for update`;
  return t!;
}

/**
 * Ainda vale a proteção de iniciante? O envio já confere, mas o alvo pode virar de um jogador enquanto a
 * marcha anda (ex.: outro jogador toma o território neutro antes). O escudo, não: ele só barra marchas
 * novas, e as que já estavam a caminho lutam normalmente.
 */
async function emProtecaoIniciante(tx: Transacao, temporadaId: string, agora: number): Promise<boolean> {
  const [temporada] = await tx<{ inicio: Date }[]>`select inicio from temporadas where id = ${temporadaId}`;
  return agora < fimProtecaoIniciante(temporada!.inicio.getTime());
}

async function concluir(tx: Transacao, marchaId: string) {
  await tx`update marchas set status = 'concluida' where id = ${marchaId}`;
}

/**
 * Tropas que voltam para casa (com ou sem saque), levando o herói se ele vier junto. Sem sobreviventes,
 * o herói volta direto para a cidade (`cidadeTerritorioId`).
 */
async function mandarDeVolta(
  tx: Transacao,
  m: Marcha,
  de: Territorio,
  sobreviventes: Exercito,
  saque: Recursos,
  agora: number,
  heroi: HeroiSalvo | null = null,
  cidadeTerritorioId: string | null = null,
  /** Velocidade da raça do jogador (o anão anda mais devagar). */
  velocidadeRaca = 0,
) {
  if (totalUnidades(sobreviventes) === 0) {
    if (heroi) await posicionarHeroi(tx, heroi.id, { territorioId: cidadeTerritorioId, marchaId: null });
    return;
  }
  const [casa] = await tx<{ x: number; y: number }[]>`select x, y from territorios where id = ${m.origem_id}`;
  const bonusVelocidade = velocidadeRaca + (heroi?.especialidade === 'desbravador' ? bonusHeroi(heroi.nivel, 'desbravador') : 0);
  const chegada = agora + duracaoMarchaMs(de, casa!, sobreviventes, bonusVelocidade);
  const [volta] = await tx<{ id: string }[]>`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria,
                         saque_comida, saque_madeira, saque_ouro, partida_em, chegada_em, heroi_id)
    values (${m.temporada_id}, ${m.jogador_id}, ${de.id}, ${m.origem_id}, 'retorno',
            ${sobreviventes.lanceiro}, ${sobreviventes.arqueiro}, ${sobreviventes.cavalaria},
            ${saque.comida}, ${saque.madeira}, ${saque.ouro}, ${new Date(agora)}, ${new Date(chegada)}, ${heroi?.id ?? null})
    returning id`;
  if (heroi) await posicionarHeroi(tx, heroi.id, { territorioId: null, marchaId: volta!.id });
}

async function resolverAtaque(tx: Transacao, m: Marcha, agora: number) {
  const destino = await territorio(tx, m.destino_id);
  const atacanteDaMarcha = tropasDa(m);
  const tipo = m.tipo as 'saque' | 'conquista';

  // Trava as cidades sempre na mesma ordem (por id do jogador) para não haver impasse entre transações.
  const ids = [m.jogador_id, destino.dono_id].filter((id): id is string => !!id).sort();
  const cidades = new Map<string, CidadeAvancada>();
  for (const id of [...new Set(ids)]) cidades.set(id, avancarAteAgora(await carregarCidade(tx, m.temporada_id, id), agora));
  const atacante = cidades.get(m.jogador_id)!;
  // Herói que veio na marcha (comandante ataca mais, saqueador carrega mais).
  const heroiAtacante = atacante.carregada.heroi?.marchaId === m.id ? atacante.carregada.heroi : null;
  // Se o alvo virou do próprio atacante enquanto a marcha andava (ex.: conquista anterior), vira reforço.
  if (destino.dono_id === m.jogador_id) {
    grupoEm(atacante, destino.id).tropas = somarExercitos(grupoEm(atacante, destino.id).tropas, atacanteDaMarcha);
    if (heroiAtacante) await posicionarHeroi(tx, heroiAtacante.id, { territorioId: destino.id, marchaId: null });
    await salvarCidade(tx, atacante);
    await concluir(tx, m.id);
    return;
  }
  // Se o alvo virou de um jogador durante a proteção de iniciante, ou o dono fez um pacto de não agressão com o
  // atacante enquanto a marcha andava, não há batalha: as tropas voltam para casa, com um relatório só para o
  // atacante explicando por quê.
  const motivoDevolucao = !destino.dono_id
    ? null
    : (await emProtecaoIniciante(tx, m.temporada_id, agora))
      ? 'protecao_iniciante'
      : (await fimDoPacto(tx, m.temporada_id, m.jogador_id, destino.dono_id, agora)) !== null
        ? 'pacto'
        : null;
  if (motivoDevolucao) {
    await tx`
      insert into relatorios (temporada_id, marcha_id, tipo, atacante_id, defensor_id, origem_id, territorio_id,
                              vencedor, conquistou, dados)
      values (${m.temporada_id}, ${m.id}, 'devolvida', ${m.jogador_id}, null, ${m.origem_id}, ${destino.id}, null, false,
              ${tx.json({ motivo: motivoDevolucao, novoDonoId: destino.dono_id, tropas: atacanteDaMarcha })})`;
    await mandarDeVolta(
      tx,
      m,
      destino,
      atacanteDaMarcha,
      recursos(),
      agora,
      heroiAtacante,
      atacante.carregada.territorioId,
      efeitosRaca(atacante.carregada.raca).velocidade,
    );
    await concluir(tx, m.id);
    return;
  }
  const defensor = destino.dono_id ? cidades.get(destino.dono_id)! : null;
  // Herói do dono parado no território atacado (castelão defende mais, se estiver livre).
  const heroiDefensor = defensor?.carregada.heroi?.territorioId === destino.id ? defensor.carregada.heroi : null;
  // Bônus somados: herói (comandante, saqueador, castelão) e raça de cada lado (orc ataca e carrega mais...).
  const racaAtacante = efeitosRaca(atacante.carregada.raca);
  const bonusAtaque = racaAtacante.ataque + (heroiAtacante?.especialidade === 'comandante' ? bonusHeroi(heroiAtacante.nivel, 'comandante') : 0);
  const bonusCarga = racaAtacante.carga + (heroiAtacante?.especialidade === 'saqueador' ? bonusHeroi(heroiAtacante.nivel, 'saqueador') : 0);

  // Exército que defende: as tropas do dono no território, ou os bárbaros.
  const [barbaros] = defensor
    ? []
    : await tx<{ id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>`
        select id, lanceiro, arqueiro, cavalaria from tropas
         where territorio_id = ${destino.id} and dono_id is null for update`;
  const grupoDefensor = defensor ? grupoEm(defensor, destino.id) : null;

  // Povoado do território (vila ou cidade livre): a cidade livre tem muralha própria e pode ter milícia
  // (lanceiros que defendem o dono sem ocupar população); a vila tem o que saquear.
  const [povoado] = await tx<
    { id: string; tipo: TipoPovoado; nivel: number; saqueada_em: Date | null; milicia: number; milicia_entregue: boolean }[]
  >`select id, tipo, nivel, saqueada_em, milicia, milicia_entregue from povoados where territorio_id = ${destino.id} for update`;
  const cidadeLivre = povoado?.tipo === 'cidade_livre';
  // Lanceiros extras do dono, fora da população: a milícia da cidade livre ou a Guarda Real na cidade do herdeiro.
  const guardaReal = defensor && destino.cidade_principal ? defensor.carregada.guardaReal : 0;
  const miliciaDefendendo = exercito({ lanceiro: (defensor && cidadeLivre ? povoado.milicia : 0) + guardaReal });
  const exercitoDefensor = grupoDefensor ? somarExercitos(grupoDefensor.tropas, miliciaDefendendo) : exercito(barbaros);

  // Paliçada pronta no território atacado (só jogadores constroem; bárbaros não têm).
  const [comPalicada] = defensor
    ? await tx`
        select 1 from estruturas
         where territorio_id = ${destino.id} and tipo = 'palicada' and pronto_em <= ${new Date(agora)}`
    : [];
  const palicada = !!comPalicada;

  const batalha = resolverBatalha({
    atacante: atacanteDaMarcha,
    defensor: exercitoDefensor,
    terreno: destino.terreno,
    nivelMuralha: defensor && destino.cidade_principal ? defensor.estado.predios.muralha : 0,
    palicada,
    cidadeLivre,
    bonusAtaque,
    bonusDefesa: bonusSeDisponivel(heroiDefensor, 'castelao', agora) + (defensor ? bonusDefesaRaca(defensor.carregada.raca, destino.terreno) : 0),
    sorte: sortearSorte(geradorComSemente(sementeDeTexto(m.id))),
    alvoCidadePrincipal: destino.cidade_principal,
  });
  const atacanteVenceu = batalha.vencedor === 'atacante';
  const conquistou = tipo === 'conquista' && batalha.permiteConquista;
  // Perdas do defensor divididas entre as tropas do dono e a milícia, na proporção de cada um.
  const [perdasDono, perdasMilicia] = distribuirPerdas(
    [grupoDefensor?.tropas ?? exercito(), miliciaDefendendo],
    batalha.perdasDefensor,
  );
  const sobreviventesDono = mapearExercito((t) => (grupoDefensor?.tropas[t] ?? 0) - perdasDono![t]);
  const miliciaDepois = miliciaDefendendo.lanceiro - perdasMilicia!.lanceiro;

  // Saque: a cidade principal (estoque do dono), a vila neutra (estoque dela) ou a vila de um jogador (volta ao nível 0).
  let saque = recursos();
  let vilaZerada = false;
  if (tipo === 'saque' && atacanteVenceu && defensor && destino.cidade_principal) {
    saque = calcularSaque({
      estoque: defensor.estado.recursos,
      nivelArmazem: defensor.estado.predios.armazem,
      sobreviventes: batalha.sobreviventesAtacante,
      bonusCarga,
    });
    defensor.estado = { ...defensor.estado, recursos: subtrairRecursos(defensor.estado.recursos, saque) };
  } else if (tipo === 'saque' && atacanteVenceu && povoado?.tipo === 'vila') {
    if (defensor) {
      saque = saquearVilaDeJogador({ nivel: povoado.nivel, sobreviventes: batalha.sobreviventesAtacante, bonusCarga });
      vilaZerada = povoado.nivel > 0;
      await tx`update povoados set nivel = 0 where id = ${povoado.id}`;
    } else {
      const r = saquearVilaNeutra({
        saqueadaEm: povoado.saqueada_em?.getTime() ?? null,
        agora,
        sobreviventes: batalha.sobreviventesAtacante,
        bonusCarga,
      });
      saque = r.saque;
      await tx`update povoados set saqueada_em = ${new Date(r.saqueadaEm)} where id = ${povoado.id}`;
    }
  }

  // Perdas e posse do território.
  let milicia = false;
  if (conquistou) {
    // O atacante fica no território; os sobreviventes do defensor recuam para a cidade dele (bárbaros se dispersam).
    await tx`update territorios set dono_id = ${m.jogador_id} where id = ${destino.id}`;
    // A estrutura e a estrada do território (prontas ou em obra) são destruídas na conquista.
    await tx`delete from estruturas where territorio_id = ${destino.id}`;
    await tx`delete from estradas where territorio_id = ${destino.id}`;
    grupoEm(atacante, destino.id).tropas = batalha.sobreviventesAtacante;
    // Povoado: muda de dono. Neutro, é leal na hora (a vila já vem no nível 1); tomado de outro jogador,
    // só dá bônus depois da lealdade. A milícia do antigo dono se dispersa; a cidade livre só entrega uma
    // milícia nova na primeira conquista.
    if (povoado) {
      const nivel = povoado.tipo === 'vila' && !defensor ? Math.max(1, povoado.nivel) : povoado.nivel;
      milicia = povoado.tipo === 'cidade_livre' && !povoado.milicia_entregue;
      await tx`
        update povoados
           set nivel = ${nivel}, posse_desde = ${new Date(agora)},
               leal_desde = ${new Date(lealDesdeNaConquista(agora, !!defensor))},
               milicia = ${milicia ? BALANCEAMENTO.povoados.cidadeLivre.milicia : 0},
               milicia_entregue = milicia_entregue or ${milicia}
         where id = ${povoado.id}`;
    }
    if (defensor && grupoDefensor) {
      grupoDefensor.tropas = exercito();
      if (defensor.carregada.territorioId) {
        const casa = grupoEm(defensor, defensor.carregada.territorioId);
        casa.tropas = somarExercitos(casa.tropas, sobreviventesDono);
      }
    } else if (barbaros) {
      await tx`delete from tropas where id = ${barbaros.id}`;
    }
  } else {
    if (grupoDefensor) {
      grupoDefensor.tropas = sobreviventesDono;
      if (povoado && cidadeLivre && miliciaDepois !== miliciaDefendendo.lanceiro) {
        await tx`update povoados set milicia = ${miliciaDepois} where id = ${povoado.id}`;
      }
      if (guardaReal > 0 && miliciaDepois !== guardaReal) {
        await tx`update cidades set guarda_real = ${miliciaDepois} where id = ${defensor!.carregada.id}`;
      }
    } else if (barbaros) {
      const s = batalha.sobreviventesDefensor;
      if (totalUnidades(s) === 0) await tx`delete from tropas where id = ${barbaros.id}`;
      else await tx`update tropas set lanceiro = ${s.lanceiro}, arqueiro = ${s.arqueiro}, cavalaria = ${s.cavalaria} where id = ${barbaros.id}`;
    }
    // O herói volta com as tropas se elas venceram; se perderam, ele é levado ferido para a cidade (abaixo).
    await mandarDeVolta(
      tx,
      m,
      destino,
      batalha.sobreviventesAtacante,
      saque,
      agora,
      atacanteVenceu ? heroiAtacante : null,
      atacante.carregada.territorioId,
      racaAtacante.velocidade,
    );
  }

  // Heróis: quem conquista fica no território; quem perde fica ferido e vai para a própria cidade.
  if (heroiAtacante && conquistou) {
    await posicionarHeroi(tx, heroiAtacante.id, { territorioId: destino.id, marchaId: null });
  } else if (heroiAtacante && !atacanteVenceu) {
    await posicionarHeroi(tx, heroiAtacante.id, {
      territorioId: atacante.carregada.territorioId,
      marchaId: null,
      feridoAte: feridoAte(agora),
    });
  }
  if (heroiDefensor && atacanteVenceu) {
    await posicionarHeroi(tx, heroiDefensor.id, {
      territorioId: defensor!.carregada.territorioId,
      marchaId: null,
      feridoAte: feridoAte(agora),
    });
  }

  // Quem perde uma defesa ganha escudo.
  if (defensor && atacanteVenceu) {
    await tx`
      insert into protecoes (temporada_id, jogador_id, tipo, ate)
      values (${m.temporada_id}, ${destino.dono_id}, 'escudo', ${new Date(escudoAte(agora))})
      on conflict (temporada_id, jogador_id, tipo) do update set ate = greatest(protecoes.ate, excluded.ate)`;
  }

  for (const cidade of cidades.values()) await salvarCidade(tx, cidade);
  await concluir(tx, m.id);

  await tx`
    insert into relatorios (temporada_id, marcha_id, tipo, atacante_id, defensor_id, origem_id, territorio_id,
                            vencedor, conquistou, dados)
    values (${m.temporada_id}, ${m.id}, ${tipo}, ${m.jogador_id}, ${destino.dono_id}, ${m.origem_id}, ${destino.id},
            ${batalha.vencedor}, ${conquistou},
            ${tx.json({
              terreno: destino.terreno,
              cidadePrincipal: destino.cidade_principal,
              muralha: defensor && destino.cidade_principal ? defensor.estado.predios.muralha : 0,
              palicada,
              povoado: povoado ? { tipo: povoado.tipo, nivel: povoado.nivel } : null,
              vilaZerada,
              milicia,
              heroiAtacante: heroiAtacante ? heroiNoRelatorio(heroiAtacante, !atacanteVenceu) : null,
              racaAtacante: atacante.carregada.raca,
              racaDefensor: defensor?.carregada.raca ?? null,
              guardaReal,
              heroiDefensor: heroiDefensor ? heroiNoRelatorio(heroiDefensor, atacanteVenceu) : null,
              forcaAtaque: batalha.forcaAtaque,
              forcaDefesa: batalha.forcaDefesa,
              margem: Number.isFinite(batalha.margem) ? batalha.margem : null,
              atacante: atacanteDaMarcha,
              defensor: exercitoDefensor,
              perdasAtacante: batalha.perdasAtacante,
              perdasDefensor: batalha.perdasDefensor,
              saque,
            })})`;
}

/**
 * Batedor chega: anota as tropas que defendem o território (de qualquer dono), o terreno, a muralha e a
 * estrutura (só o batedor descobre qual é; no mapa os outros veem só que há uma).
 * O jogador só vê o relatório quando o batedor volta (disponivel_em), e uma marcha vazia de volta
 * desenha o caminho no mapa.
 */
async function resolverReconhecimento(tx: Transacao, m: Marcha, agora: number) {
  const [destino] = await tx<Territorio[]>`select id, dono_id, cidade_principal, terreno, x, y from territorios where id = ${m.destino_id}`;
  const [casa] = await tx<{ x: number; y: number }[]>`select x, y from territorios where id = ${m.origem_id}`;
  const [vistas] = await tx<{ lanceiro: number; arqueiro: number; cavalaria: number }[]>`
    select coalesce(sum(lanceiro), 0)::int as lanceiro, coalesce(sum(arqueiro), 0)::int as arqueiro,
           coalesce(sum(cavalaria), 0)::int as cavalaria
      from tropas where territorio_id = ${m.destino_id}`;
  const [muralha] = destino!.cidade_principal
    ? await tx<{ nivel: number }[]>`
        select p.nivel from predios p join cidades c on c.id = p.cidade_id
         where c.temporada_id = ${m.temporada_id} and c.territorio_id = ${destino!.id} and p.tipo = 'muralha'`
    : [];
  const [estrutura] = await tx<{ tipo: string; pronta: boolean }[]>`
    select tipo, pronto_em <= ${new Date(agora)} as pronta from estruturas where territorio_id = ${m.destino_id}`;
  // A milícia da cidade livre também defende: o batedor a conta junto com os lanceiros.
  const [povoado] = await tx<{ milicia: number }[]>`select milicia from povoados where territorio_id = ${m.destino_id}`;
  // A Guarda Real do herdeiro também defende a cidade dele.
  const [guarda] = await tx<{ guarda_real: number }[]>`select guarda_real from cidades where territorio_id = ${m.destino_id}`;
  // Herói parado no território: o batedor descobre nome, especialidade e nível.
  const heroi = await heroiNoTerritorio(tx, m.destino_id);
  const volta = duracaoReconhecimentoMs(destino!, casa!);

  await tx`
    insert into reconhecimentos (temporada_id, jogador_id, territorio_id, dono_id, terreno, muralha,
                                 lanceiro, arqueiro, cavalaria, estrutura, estrutura_pronta, heroi, observado_em, disponivel_em)
    values (${m.temporada_id}, ${m.jogador_id}, ${destino!.id}, ${destino!.dono_id}, ${destino!.terreno}, ${muralha?.nivel ?? 0},
            ${vistas!.lanceiro + (destino!.dono_id ? (povoado?.milicia ?? 0) + (guarda?.guarda_real ?? 0) : 0)}, ${vistas!.arqueiro}, ${vistas!.cavalaria},
            ${estrutura?.tipo ?? null}, ${estrutura?.pronta ?? false},
            ${heroi ? tx.json({ nome: heroi.nome, especialidade: heroi.especialidade, nivel: heroi.nivel }) : null},
            ${new Date(agora)}, ${new Date(agora + volta)})`;
  await tx`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, partida_em, chegada_em)
    values (${m.temporada_id}, ${m.jogador_id}, ${destino!.id}, ${m.origem_id}, 'retorno', ${new Date(agora)}, ${new Date(agora + volta)})`;
  await concluir(tx, m.id);
}

/** Tropas chegam em casa: entram no território de origem (se ainda for do jogador) ou na cidade, com o saque. */
async function resolverRetorno(tx: Transacao, m: Marcha, agora: number) {
  const c = avancarAteAgora(await carregarCidade(tx, m.temporada_id, m.jogador_id), agora);
  const [casa] = await tx<{ dono_id: string | null }[]>`select dono_id from territorios where id = ${m.destino_id}`;
  const destino = casa?.dono_id === m.jogador_id ? m.destino_id : c.carregada.territorioId;
  if (destino) {
    const grupo = grupoEm(c, destino);
    grupo.tropas = somarExercitos(grupo.tropas, tropasDa(m));
  }
  const saque = { comida: m.saque_comida, madeira: m.saque_madeira, ouro: m.saque_ouro };
  c.estado = { ...c.estado, recursos: receberSaque(c.estado.recursos, saque, c.estado.predios.armazem) };
  if (c.carregada.heroi?.marchaId === m.id) {
    await posicionarHeroi(tx, c.carregada.heroi.id, { territorioId: destino, marchaId: null });
  }
  await salvarCidade(tx, c);
  await concluir(tx, m.id);
}

async function resolverMarcha(id: string): Promise<boolean> {
  return await sql.begin(async (tx) => {
    const [m] = await tx<Marcha[]>`
      select id, temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria,
             saque_comida, saque_madeira, saque_ouro, heroi_id
        from marchas where id = ${id} and status = 'a_caminho' and chegada_em <= now()
         for update skip locked`;
    if (!m) return false;
    const agora = Date.now();
    // Retorno e movimento: as tropas chegam a um território próprio (ou à cidade, se ele foi perdido).
    if (m.tipo === 'retorno' || m.tipo === 'movimento') await resolverRetorno(tx, m, agora);
    else if (m.tipo === 'reconhecimento') await resolverReconhecimento(tx, m, agora);
    else await resolverAtaque(tx, m, agora);
    return true;
  });
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get('SEGREDO_CRON');
  if (!segredo || req.headers.get('x-segredo-cron') !== segredo) return resposta(401, { erro: 'Não autorizado.' });

  const pendentes = await sql<{ id: string }[]>`
    select m.id from marchas m join temporadas t on t.id = m.temporada_id and t.status = 'ativa'
     where m.status = 'a_caminho' and m.chegada_em <= now() order by m.chegada_em limit 50`;
  let resolvidas = 0;
  const erros: string[] = [];
  for (const { id } of pendentes) {
    try {
      if (await resolverMarcha(id)) resolvidas++;
    } catch (erro) {
      console.error('marcha', id, erro);
      erros.push(id);
    }
  }
  // Hordas bárbaras: as que chegaram lutam; a próxima sai quando for a hora.
  await cuidarDasHordas(erros);
  // Depois das batalhas: placar, objetivos e, se for o caso, fim da temporada.
  let encerrada = false;
  try {
    encerrada = (await sql.begin((tx) => atualizarPlacar(tx))).encerrada;
  } catch (erro) {
    console.error('placar', erro);
    erros.push('placar');
  }
  return resposta(200, { resolvidas, erros, encerrada });
});
