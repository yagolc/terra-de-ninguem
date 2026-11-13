// Objetivos secretos, placar e fim de temporada (Épico 7).
import {
  avaliarObjetivo,
  cidadesAlheiasPorRegiao,
  monopolioComercial,
  objetivoMetadeDoMapa,
  pontuar,
  racasVizinhas,
  relogioDoObjetivo,
  sementeDeTexto,
  sortearObjetivo,
  vizinhancaDaCidade,
  vencedorPorPontos,
  type Objetivo,
  type Raca,
} from '../../../packages/regras/src/index.ts';
import { avancarAteAgora, carregarCidade, herdeiroDoTrono, salvarCidade } from './cidade.ts';
import type { Transacao } from './db.ts';

/** Sorteia o objetivo do jogador na temporada, se ele ainda não tiver um. */
export async function garantirObjetivo(tx: Transacao, temporadaId: string, jogadorId: string): Promise<void> {
  await tx`select pg_advisory_xact_lock(hashtext(${'objetivos:' + temporadaId}))`;
  const [existente] = await tx`select 1 from objetivos where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}`;
  if (existente) return;
  const objetivo = await sortearPara(tx, temporadaId, jogadorId);
  if (!objetivo) return; // temporada sem mapa
  await tx`insert into objetivos (temporada_id, jogador_id, objetivo) values (${temporadaId}, ${jogadorId}, ${tx.json(objetivo)})`;
}

/** Sorteia um objetivo para o jogador, variando em relação aos dos outros. Null se a temporada não tem mapa. */
async function sortearPara(tx: Transacao, temporadaId: string, jogadorId: string): Promise<Objetivo | null> {
  const regioes = await tx<{ id: string; territorios: number }[]>`
    select r.id, count(t.id)::int as territorios
      from regioes r join territorios t on t.regiao_id = r.id
     where r.temporada_id = ${temporadaId}
     group by r.id order by r.indice`;
  if (regioes.length === 0) return null;
  // Onde fica a cidade: "duas regiões" sai perto dela e "velha rixa" só mira raças de vizinhos próximos.
  const territorios = await tx<{ id: string; regiao_id: string }[]>`
    select id, regiao_id from territorios where temporada_id = ${temporadaId}`;
  const fronteiras = (
    await tx<{ territorio_a: string; territorio_b: string }[]>`
      select territorio_a, territorio_b from fronteiras where temporada_id = ${temporadaId}`
  ).map((f) => [f.territorio_a, f.territorio_b] as const);
  const cidades = await tx<{ jogador_id: string; raca: Raca | null; territorio_id: string | null }[]>`
    select jogador_id, raca, territorio_id from cidades where temporada_id = ${temporadaId}`;
  const minha = cidades.find((c) => c.jogador_id === jogadorId);
  const cidade = minha?.territorio_id
    ? vizinhancaDaCidade({
        territorios: territorios.map((t) => ({ id: t.id, regiaoId: t.regiao_id })),
        fronteiras,
        cidadeTerritorioId: minha.territorio_id,
      })
    : null;
  const racasRivais = minha?.territorio_id
    ? racasVizinhas({
        fronteiras,
        cidadeTerritorioId: minha.territorio_id,
        minhaRaca: minha.raca,
        outros: cidades.flatMap((c) =>
          c.jogador_id !== jogadorId && c.territorio_id ? [{ territorioId: c.territorio_id, raca: c.raca }] : [],
        ),
      })
    : [];
  const jaSorteados = await tx<{ objetivo: Objetivo }[]>`
    select objetivo from objetivos where temporada_id = ${temporadaId} and jogador_id <> ${jogadorId}`;
  const [vilas] = await tx<{ total: number }[]>`
    select count(*)::int as total from povoados where temporada_id = ${temporadaId} and tipo = 'vila'`;

  return sortearObjetivo({
    semente: sementeDeTexto(`${temporadaId}:${jogadorId}`),
    regioes,
    totalTerritorios: regioes.reduce((soma, r) => soma + r.territorios, 0),
    racasRivais,
    jaSorteados: jaSorteados.map((o) => o.objetivo),
    vilasNoMapa: vilas?.total ?? 0,
    ...(cidade ? { cidade } : {}),
  });
}

/**
 * Atualiza a cidade de todos (gravando o que ficou pronto), recalcula o placar, confere os objetivos e encerra a temporada se alguém cumpriu o seu,
 * se alguém fez o monopólio comercial (aberto a todos) ou se o prazo acabou (aí vence quem tem mais pontos). Chamado a cada minuto pelo resolver-marchas.
 */
export async function atualizarPlacar(tx: Transacao): Promise<{ encerrada: boolean }> {
  const [temporada] = await tx<{ id: string; inicio: Date; fim_previsto: Date | null }[]>`
    select id, inicio, fim_previsto from temporadas where status = 'ativa' for update`;
  if (!temporada) return { encerrada: false };
  const temporadaId = temporada.id;
  const agora = Date.now();

  const territorios = await tx<{ id: string; regiao_id: string; dono_id: string | null; cidade_principal: boolean }[]>`
    select id, regiao_id, dono_id, cidade_principal from territorios where temporada_id = ${temporadaId}`;
  if (territorios.length === 0) return { encerrada: false };
  const territoriosPorRegiao = new Map<string, number>();
  for (const t of territorios) territoriosPorRegiao.set(t.regiao_id, (territoriosPorRegiao.get(t.regiao_id) ?? 0) + 1);

  const tropas = await tx<{ territorio_id: string; dono_id: string; total: number }[]>`
    select territorio_id, dono_id, (lanceiro + arqueiro + cavalaria)::int as total
      from tropas where temporada_id = ${temporadaId} and dono_id is not null`;
  const vitorias = await tx<{ jogador_id: string; vitorias: number }[]>`
    select jogador_id, count(*)::int as vitorias from (
      select atacante_id as jogador_id from relatorios where temporada_id = ${temporadaId} and vencedor = 'atacante'
      union all
      select defensor_id from relatorios where temporada_id = ${temporadaId} and vencedor = 'defensor' and defensor_id is not null
    ) v group by jogador_id`;
  // Para o "senhor da guerra": vitórias só contra jogadores (o atacante é sempre jogador).
  const vitoriasContraJogadores = await tx<{ jogador_id: string; vitorias: number }[]>`
    select jogador_id, count(*)::int as vitorias from (
      select atacante_id as jogador_id from relatorios
       where temporada_id = ${temporadaId} and vencedor = 'atacante' and defensor_id is not null
      union all
      select defensor_id from relatorios where temporada_id = ${temporadaId} and vencedor = 'defensor' and defensor_id is not null
    ) v group by jogador_id`;
  // Monopólio comercial (aberto a todos): dono atual de cada cidade livre e desde quando.
  // "Senhor das vilas": nível de cada vila e o dono (o do território).
  const vilas = await tx<{ dono_id: string | null; nivel: number }[]>`
    select t.dono_id, p.nivel from povoados p join territorios t on t.id = p.territorio_id
     where p.temporada_id = ${temporadaId} and p.tipo = 'vila'`;
  const cidadesLivres = await tx<{ dono_id: string | null; posse_desde: Date | null }[]>`
    select t.dono_id, p.posse_desde from povoados p join territorios t on t.id = p.territorio_id
     where p.temporada_id = ${temporadaId} and p.tipo = 'cidade_livre'`;
  const conquistas = await tx<{ atacante_id: string; defensor_id: string }[]>`
    select distinct atacante_id, defensor_id from relatorios
     where temporada_id = ${temporadaId} and conquistou and defensor_id is not null`;
  const objetivos = await tx<{ id: string; jogador_id: string; objetivo: Objetivo }[]>`
    select id, jogador_id, objetivo from objetivos where temporada_id = ${temporadaId}`;
  const jogadores = await tx<{ jogador_id: string; raca: Raca | null }[]>`
    select jogador_id, raca from cidades where temporada_id = ${temporadaId} order by jogador_id`;
  // Cabeça a prêmio: vitórias contra o herdeiro do trono (atacando ou defendendo) valem pontos a mais.
  const herdeiro = await herdeiroDoTrono(tx, temporadaId);
  const contraHerdeiro = herdeiro
    ? await tx<{ jogador_id: string; vitorias: number }[]>`
        select jogador_id, count(*)::int as vitorias from (
          select atacante_id as jogador_id from relatorios
           where temporada_id = ${temporadaId} and vencedor = 'atacante' and defensor_id = ${herdeiro}
          union all
          select defensor_id from relatorios
           where temporada_id = ${temporadaId} and vencedor = 'defensor' and atacante_id = ${herdeiro} and defensor_id is not null
        ) v group by jogador_id`
    : [];
  // "Velha rixa": territórios diferentes que cada jogador conquistou de cada outro jogador.
  const territoriosConquistados = await tx<{ atacante_id: string; defensor_id: string; territorio_id: string }[]>`
    select distinct atacante_id, defensor_id, territorio_id from relatorios
     where temporada_id = ${temporadaId} and conquistou and defensor_id is not null`;

  // Relógio de quem já estava cumprindo o objetivo no minuto anterior (público, no placar).
  const relogios = await tx<{ jogador_id: string; objetivo_desde: Date | null }[]>`
    select jogador_id, objetivo_desde from placar where temporada_id = ${temporadaId}`;

  const placar: {
    jogadorId: string;
    territorios: number;
    populacao: number;
    vitorias: number;
    pontos: number;
    objetivoDesde: number | null;
  }[] = [];
  const cumpriram: string[] = [];

  for (const { jogador_id: jogadorId } of jogadores) {
    // Avança a cidade até agora e grava: produção, obras e lotes de treino prontos chegam ao banco em até
    // um minuto, mesmo sem o jogador fazer nada (o mapa e os ataques leem as tropas gravadas).
    const cidade = avancarAteAgora(await carregarCidade(tx, temporadaId, jogadorId), agora);
    await salvarCidade(tx, cidade);
    const meus = territorios.filter((t) => t.dono_id === jogadorId);
    const linha = {
      jogadorId,
      territorios: meus.length,
      populacao: Math.floor(cidade.estado.populacao),
      vitorias: vitorias.find((v) => v.jogador_id === jogadorId)?.vitorias ?? 0,
      vitoriasContraHerdeiro: contraHerdeiro.find((v) => v.jogador_id === jogadorId)?.vitorias ?? 0,
      pontos: 0,
      objetivoDesde: null as number | null,
    };
    linha.pontos = pontuar(linha);
    placar.push(linha);

    const registro = objetivos.find((o) => o.jogador_id === jogadorId);
    if (!registro) continue;
    let objetivo = registro.objetivo;
    // O monopólio deixou de ser objetivo secreto: quem o tinha recebe outro, sorteado entre os que sobram.
    if (objetivo.tipo === 'monopolio_comercial') {
      const novo = await sortearPara(tx, temporadaId, jogadorId);
      if (novo) {
        objetivo = novo;
        await tx`update objetivos set objetivo = ${tx.json(objetivo)}, sorteado_em = now() where id = ${registro.id}`;
      }
    }
    // Rival que saiu do jogo (conta apagada): o objetivo vira "metade do mapa", como quando outro o derruba antes.
    const alvo = objetivo.tipo === 'derrubar_rival' ? objetivo.rivalId : null;
    if (alvo && !jogadores.some((j) => j.jogador_id === alvo)) {
      objetivo = objetivoMetadeDoMapa();
      await tx`update objetivos set objetivo = ${tx.json(objetivo)} where id = ${registro.id}`;
    }
    const rivalId = objetivo.tipo === 'derrubar_rival' ? objetivo.rivalId : null;
    const racaRival = objetivo.tipo === 'velha_rixa' ? objetivo.raca : null;
    const daRaca = racaRival ? jogadores.filter((j) => j.raca === racaRival).map((j) => j.jogador_id) : [];
    const avaliacao = avaliarObjetivo(objetivo, {
      meusTerritorios: meus.map((t) => ({
        id: t.id,
        regiaoId: t.regiao_id,
        minhasTropas: tropas.find((x) => x.territorio_id === t.id && x.dono_id === jogadorId)?.total ?? 0,
      })),
      territoriosPorRegiao,
      cidadesAlheiasPorRegiao: cidadesAlheiasPorRegiao(
        territorios.map((t) => ({ regiaoId: t.regiao_id, donoId: t.dono_id, cidadePrincipal: t.cidade_principal })),
        jogadorId,
      ),
      totalTerritorios: territorios.length,
      populacao: cidade.estado.populacao,
      vitoriasContraJogadores: vitoriasContraJogadores.find((v) => v.jogador_id === jogadorId)?.vitorias ?? 0,
      niveisPredios: Object.values(cidade.estado.predios),
      nivelMuralha: cidade.estado.predios.muralha,
      niveisVilas: vilas.filter((v) => v.dono_id === jogadorId).map((v) => v.nivel),
      cidadesLivres: cidadesLivres.map((c) => ({ minha: c.dono_id === jogadorId, posseDesde: c.posse_desde?.getTime() ?? null })),
      agora,
      ouro: cidade.estado.recursos.ouro,
      rixa: racaRival
        ? {
            territoriosConquistados: new Set(
              territoriosConquistados
                .filter((c) => c.atacante_id === jogadorId && daRaca.includes(c.defensor_id))
                .map((c) => c.territorio_id),
            ).size,
            jogadoresDaRaca: daRaca.length,
            todosSoNaCidade: daRaca.every((id) => territorios.filter((t) => t.dono_id === id).length <= 1),
          }
        : undefined,
      rival: rivalId
        ? {
            territorios: territorios.filter((t) => t.dono_id === rivalId).length,
            conquisteiDele: conquistas.some((c) => c.atacante_id === jogadorId && c.defensor_id === rivalId),
            outrosConquistaramDele: conquistas.some((c) => c.atacante_id !== jogadorId && c.defensor_id === rivalId),
          }
        : undefined,
    });
    if (avaliacao.viraObjetivo) {
      await tx`update objetivos set objetivo = ${tx.json(avaliacao.viraObjetivo)} where id = ${registro.id}`;
    }
    // Cumprido, precisa segurar por algumas horas (relógio público) e fica sem escudo enquanto isso.
    const relogio = relogioDoObjetivo({
      cumprido: avaliacao.cumprido,
      segurandoDesde: relogios.find((r) => r.jogador_id === jogadorId)?.objetivo_desde?.getTime() ?? null,
      agora,
      inicioTemporada: temporada.inicio.getTime(),
    });
    linha.objetivoDesde = relogio.segurandoDesde;
    if (relogio.segurandoDesde !== null) {
      await tx`delete from protecoes where temporada_id = ${temporadaId} and jogador_id = ${jogadorId} and tipo = 'escudo'`;
      // Os pactos de não agressão dele acabam agora: senão, pactos fechados antes o deixariam intocável no relógio.
      await tx`
        update cartas set pacto_ate = ${new Date(agora)}
         where temporada_id = ${temporadaId} and proposta = 'nao_agressao' and pacto_ate > ${new Date(agora)}
           and (remetente_id = ${jogadorId} or destinatario_id = ${jogadorId})`;
    }
    if (relogio.venceu) cumpriram.push(jogadorId);
  }

  for (const p of placar) {
    await tx`
      insert into placar (temporada_id, jogador_id, territorios, populacao, vitorias, pontos, objetivo_desde, atualizado_em)
      values (${temporadaId}, ${p.jogadorId}, ${p.territorios}, ${p.populacao}, ${p.vitorias}, ${p.pontos},
              ${p.objetivoDesde === null ? null : new Date(p.objetivoDesde)}, now())
      on conflict (temporada_id, jogador_id) do update
        set territorios = excluded.territorios, populacao = excluded.populacao, vitorias = excluded.vitorias,
            pontos = excluded.pontos, objetivo_desde = excluded.objetivo_desde, atualizado_em = now()`;
  }

  const monopolio = monopolioComercial(
    cidadesLivres.map((c) => ({ donoId: c.dono_id, posseDesde: c.posse_desde?.getTime() ?? null })),
    agora,
  );
  const fezMonopolio = monopolio?.cumprido ? monopolio.donoId : null;
  // Se mais de um venceu no mesmo minuto (objetivo ou monopólio), vence quem tem mais pontos entre eles.
  const porObjetivo = vencedorPorPontos(placar.filter((p) => cumpriram.includes(p.jogadorId) || p.jogadorId === fezMonopolio));
  const prazoAcabou = temporada.fim_previsto !== null && agora >= temporada.fim_previsto.getTime();
  const vencedor = porObjetivo ?? (prazoAcabou ? vencedorPorPontos(placar) : null);
  if (!porObjetivo && !prazoAcabou) return { encerrada: false };

  const motivo = !porObjetivo ? 'prazo' : cumpriram.includes(porObjetivo.jogadorId) ? 'objetivo' : 'monopolio';
  if (porObjetivo && motivo === 'objetivo') {
    await tx`update objetivos set cumprido_em = now() where temporada_id = ${temporadaId} and jogador_id = ${porObjetivo.jogadorId}`;
  }
  await tx`
    update temporadas
       set status = 'encerrada', vencedor_id = ${vencedor?.jogadorId ?? null}, encerrada_em = now(), motivo_fim = ${motivo}
     where id = ${temporadaId}`;
  return { encerrada: true };
}
