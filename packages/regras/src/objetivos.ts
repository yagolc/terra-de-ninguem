// Objetivos secretos e pontuação (GDD: "Temporadas e condições de vitória").
import { geradorComSemente } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { HORA_MS } from './util.ts';

export type Objetivo =
  | { tipo: 'duas_regioes'; regioes: [string, string] }
  | { tipo: 'metade_do_mapa'; territorios: number }
  | { tipo: 'territorios_defendidos'; territorios: number; guarnicaoMinima: number }
  | { tipo: 'derrubar_rival'; rivalId: string }
  | { tipo: 'populacao'; populacao: number };

export type TipoObjetivo = Objetivo['tipo'];

export function objetivoMetadeDoMapa(totalTerritorios: number): Objetivo {
  return { tipo: 'metade_do_mapa', territorios: Math.ceil(totalTerritorios * BALANCEAMENTO.objetivos.fracaoMetadeDoMapa) };
}

/**
 * Sorteia o objetivo de um jogador. Prefere tipos que ninguém tirou ainda, para variar; "derrubar
 * rival" só sai se já houver outro jogador; a dupla de regiões tem tamanho parecido com as outras metas.
 */
export function sortearObjetivo(entrada: {
  semente: number;
  /** Regiões do mapa e quantos territórios cada uma tem. */
  regioes: { id: string; territorios: number }[];
  totalTerritorios: number;
  /** Outros jogadores que já têm cidade nesta temporada. */
  rivais: string[];
  /** Objetivos já sorteados para outros jogadores. */
  jaSorteados: Objetivo[];
}): Objetivo {
  const { regioes, totalTerritorios, rivais, jaSorteados } = entrada;
  const aleatorio = geradorComSemente(entrada.semente);
  const escolher = <T>(lista: T[]): T => lista[Math.floor(aleatorio() * lista.length)]!;
  const config = BALANCEAMENTO.objetivos;

  const duplas: [string, string][] = [];
  for (let a = 0; a < regioes.length; a++) {
    for (let b = a + 1; b < regioes.length; b++) {
      const soma = regioes[a]!.territorios + regioes[b]!.territorios;
      if (soma >= totalTerritorios * config.duplaDeRegioesMin && soma <= totalTerritorios * config.duplaDeRegioesMax) {
        duplas.push([regioes[a]!.id, regioes[b]!.id]);
      }
    }
  }
  const duplasUsadas = new Set(jaSorteados.flatMap((o) => (o.tipo === 'duas_regioes' ? [[...o.regioes].sort().join('|')] : [])));
  const duplasLivres = duplas.filter((d) => !duplasUsadas.has([...d].sort().join('|')));
  const alvosUsados = new Set(jaSorteados.flatMap((o) => (o.tipo === 'derrubar_rival' ? [o.rivalId] : [])));
  const rivaisLivres = rivais.filter((r) => !alvosUsados.has(r));

  const possiveis: TipoObjetivo[] = ['metade_do_mapa', 'territorios_defendidos', 'populacao'];
  if (duplasLivres.length > 0) possiveis.push('duas_regioes');
  if (rivaisLivres.length > 0) possiveis.push('derrubar_rival');
  const tiposUsados = new Set(jaSorteados.map((o) => o.tipo));
  const novos = possiveis.filter((t) => !tiposUsados.has(t));

  switch (escolher(novos.length > 0 ? novos : possiveis)) {
    case 'duas_regioes':
      return { tipo: 'duas_regioes', regioes: escolher(duplasLivres) };
    case 'derrubar_rival':
      return { tipo: 'derrubar_rival', rivalId: escolher(rivaisLivres) };
    case 'territorios_defendidos':
      return {
        tipo: 'territorios_defendidos',
        territorios: Math.ceil(totalTerritorios * config.fracaoDefendidos),
        guarnicaoMinima: config.guarnicaoMinima,
      };
    case 'populacao':
      return { tipo: 'populacao', populacao: config.populacaoAlvo };
    case 'metade_do_mapa':
      return objetivoMetadeDoMapa(totalTerritorios);
  }
}

export type SituacaoJogador = {
  /** Territórios do jogador, com a região e quantas tropas dele estão lá. */
  meusTerritorios: { regiaoId: string; minhasTropas: number }[];
  territoriosPorRegiao: ReadonlyMap<string, number>;
  totalTerritorios: number;
  populacao: number;
  /** Só para "derrubar rival". */
  rival?: { territorios: number; conquisteiDele: boolean; outrosConquistaramDele: boolean };
};

export type AvaliacaoObjetivo = {
  cumprido: boolean;
  /** Quanto falta, para a barra de progresso. */
  atual: number;
  alvo: number;
  /** "Derrubar rival" vira "metade do mapa" se outro jogador derrubar o rival antes (GDD). */
  viraObjetivo?: Objetivo;
};

export function avaliarObjetivo(objetivo: Objetivo, s: SituacaoJogador): AvaliacaoObjetivo {
  switch (objetivo.tipo) {
    case 'duas_regioes': {
      const alvo = objetivo.regioes.reduce((soma, r) => soma + (s.territoriosPorRegiao.get(r) ?? 0), 0);
      const atual = s.meusTerritorios.filter((t) => objetivo.regioes.includes(t.regiaoId)).length;
      return { cumprido: alvo > 0 && atual >= alvo, atual, alvo };
    }
    case 'metade_do_mapa': {
      const atual = s.meusTerritorios.length;
      return { cumprido: atual >= objetivo.territorios, atual, alvo: objetivo.territorios };
    }
    case 'territorios_defendidos': {
      const atual = s.meusTerritorios.filter((t) => t.minhasTropas >= objetivo.guarnicaoMinima).length;
      return { cumprido: atual >= objetivo.territorios, atual, alvo: objetivo.territorios };
    }
    case 'populacao': {
      const atual = Math.floor(s.populacao);
      return { cumprido: atual >= objetivo.populacao, atual, alvo: objetivo.populacao };
    }
    case 'derrubar_rival': {
      const rival = s.rival ?? { territorios: 1, conquisteiDele: false, outrosConquistaramDele: false };
      // Progresso: territórios que o rival ainda tem além da cidade principal (zero = derrubado).
      const atual = Math.max(0, rival.territorios - 1);
      const derrubado = rival.territorios <= 1;
      if (derrubado && rival.conquisteiDele) return { cumprido: true, atual, alvo: 0 };
      if (derrubado && rival.outrosConquistaramDele) {
        return { cumprido: false, atual, alvo: 0, viraObjetivo: objetivoMetadeDoMapa(s.totalTerritorios) };
      }
      return { cumprido: false, atual, alvo: 0 };
    }
  }
}

export function pontuar(entrada: { territorios: number; populacao: number; vitorias: number }): number {
  const { porTerritorio, porHabitante, porVitoria } = BALANCEAMENTO.pontos;
  return entrada.territorios * porTerritorio + Math.floor(entrada.populacao) * porHabitante + entrada.vitorias * porVitoria;
}

/** Prazo da temporada (ms). */
export function fimDaTemporada(inicio: number): number {
  return inicio + BALANCEAMENTO.temporada.duracaoDias * 24 * HORA_MS;
}

/** Vencedor por pontos quando o prazo acaba: mais pontos, depois mais territórios, depois o id (estável). */
export function vencedorPorPontos<T extends { jogadorId: string; pontos: number; territorios: number }>(placar: T[]): T | null {
  return (
    [...placar].sort(
      (a, b) => b.pontos - a.pontos || b.territorios - a.territorios || a.jogadorId.localeCompare(b.jogadorId),
    )[0] ?? null
  );
}
