// Objetivos secretos, placar e fim de temporada (Épico 7).
import {
  avaliarObjetivo,
  objetivoMetadeDoMapa,
  pontuar,
  sementeDeTexto,
  sortearObjetivo,
  vencedorPorPontos,
  type Objetivo,
} from '../../../packages/regras/src/index.ts';
import { avancarAteAgora, carregarCidade, salvarCidade } from './cidade.ts';
import type { Transacao } from './db.ts';

/** Sorteia o objetivo do jogador na temporada, se ele ainda não tiver um. */
export async function garantirObjetivo(tx: Transacao, temporadaId: string, jogadorId: string): Promise<void> {
  await tx`select pg_advisory_xact_lock(hashtext(${'objetivos:' + temporadaId}))`;
  const [existente] = await tx`select 1 from objetivos where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}`;
  if (existente) return;

  const regioes = await tx<{ id: string; territorios: number }[]>`
    select r.id, count(t.id)::int as territorios
      from regioes r join territorios t on t.regiao_id = r.id
     where r.temporada_id = ${temporadaId}
     group by r.id order by r.indice`;
  if (regioes.length === 0) return; // temporada sem mapa
  const rivais = await tx<{ jogador_id: string }[]>`
    select jogador_id from cidades where temporada_id = ${temporadaId} and jogador_id <> ${jogadorId}`;
  const jaSorteados = await tx<{ objetivo: Objetivo }[]>`select objetivo from objetivos where temporada_id = ${temporadaId}`;

  const objetivo = sortearObjetivo({
    semente: sementeDeTexto(`${temporadaId}:${jogadorId}`),
    regioes,
    totalTerritorios: regioes.reduce((soma, r) => soma + r.territorios, 0),
    rivais: rivais.map((r) => r.jogador_id),
    jaSorteados: jaSorteados.map((o) => o.objetivo),
  });
  await tx`insert into objetivos (temporada_id, jogador_id, objetivo) values (${temporadaId}, ${jogadorId}, ${tx.json(objetivo)})`;
}

/**
 * Atualiza a cidade de todos (gravando o que ficou pronto), recalcula o placar, confere os objetivos e encerra a temporada se alguém cumpriu o seu
 * (ou se o prazo acabou: aí vence quem tem mais pontos). Chamado a cada minuto pelo resolver-marchas.
 */
export async function atualizarPlacar(tx: Transacao): Promise<{ encerrada: boolean }> {
  const [temporada] = await tx<{ id: string; fim_previsto: Date | null }[]>`
    select id, fim_previsto from temporadas where status = 'ativa' for update`;
  if (!temporada) return { encerrada: false };
  const temporadaId = temporada.id;
  const agora = Date.now();

  const territorios = await tx<{ id: string; regiao_id: string; dono_id: string | null }[]>`
    select id, regiao_id, dono_id from territorios where temporada_id = ${temporadaId}`;
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
  const conquistas = await tx<{ atacante_id: string; defensor_id: string }[]>`
    select distinct atacante_id, defensor_id from relatorios
     where temporada_id = ${temporadaId} and conquistou and defensor_id is not null`;
  const objetivos = await tx<{ id: string; jogador_id: string; objetivo: Objetivo }[]>`
    select id, jogador_id, objetivo from objetivos where temporada_id = ${temporadaId}`;
  const jogadores = await tx<{ jogador_id: string }[]>`select jogador_id from cidades where temporada_id = ${temporadaId} order by jogador_id`;

  const placar: { jogadorId: string; territorios: number; populacao: number; vitorias: number; pontos: number }[] = [];
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
      pontos: 0,
    };
    linha.pontos = pontuar(linha);
    placar.push(linha);

    const registro = objetivos.find((o) => o.jogador_id === jogadorId);
    if (!registro) continue;
    let objetivo = registro.objetivo;
    // Rival que saiu do jogo (conta apagada): o objetivo vira "metade do mapa", como quando outro o derruba antes.
    const alvo = objetivo.tipo === 'derrubar_rival' ? objetivo.rivalId : null;
    if (alvo && !jogadores.some((j) => j.jogador_id === alvo)) {
      objetivo = objetivoMetadeDoMapa(territorios.length);
      await tx`update objetivos set objetivo = ${tx.json(objetivo)} where id = ${registro.id}`;
    }
    const rivalId = objetivo.tipo === 'derrubar_rival' ? objetivo.rivalId : null;
    const avaliacao = avaliarObjetivo(objetivo, {
      meusTerritorios: meus.map((t) => ({
        regiaoId: t.regiao_id,
        minhasTropas: tropas.find((x) => x.territorio_id === t.id && x.dono_id === jogadorId)?.total ?? 0,
      })),
      territoriosPorRegiao,
      totalTerritorios: territorios.length,
      populacao: cidade.estado.populacao,
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
    if (avaliacao.cumprido) cumpriram.push(jogadorId);
  }

  for (const p of placar) {
    await tx`
      insert into placar (temporada_id, jogador_id, territorios, populacao, vitorias, pontos, atualizado_em)
      values (${temporadaId}, ${p.jogadorId}, ${p.territorios}, ${p.populacao}, ${p.vitorias}, ${p.pontos}, now())
      on conflict (temporada_id, jogador_id) do update
        set territorios = excluded.territorios, populacao = excluded.populacao, vitorias = excluded.vitorias,
            pontos = excluded.pontos, atualizado_em = now()`;
  }

  // Se mais de um cumpriu no mesmo minuto, vence quem tem mais pontos entre eles.
  const porObjetivo = vencedorPorPontos(placar.filter((p) => cumpriram.includes(p.jogadorId)));
  const prazoAcabou = temporada.fim_previsto !== null && agora >= temporada.fim_previsto.getTime();
  const vencedor = porObjetivo ?? (prazoAcabou ? vencedorPorPontos(placar) : null);
  if (!porObjetivo && !prazoAcabou) return { encerrada: false };

  if (porObjetivo) {
    await tx`update objetivos set cumprido_em = now() where temporada_id = ${temporadaId} and jogador_id = ${porObjetivo.jogadorId}`;
  }
  await tx`
    update temporadas
       set status = 'encerrada', vencedor_id = ${vencedor?.jogadorId ?? null}, encerrada_em = now(),
           motivo_fim = ${porObjetivo ? 'objetivo' : 'prazo'}
     where id = ${temporadaId}`;
  return { encerrada: true };
}
