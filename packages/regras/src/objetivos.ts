// Objetivos secretos e pontuação (GDD: "Temporadas e condições de vitória").
import { geradorComSemente } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import type { Raca } from './tipos.ts';
import { HORA_MS } from './util.ts';

export type Objetivo =
  | { tipo: 'duas_regioes'; regioes: [string, string] }
  /** A meta é calculada na hora, sobre os territórios conquistáveis (ver `metaMetadeDoMapa`). */
  | { tipo: 'metade_do_mapa' }
  | { tipo: 'territorios_defendidos'; territorios: number; guarnicaoMinima: number }
  /** Não é mais sorteado (virou "velha rixa"); fica para as cartas das temporadas antigas. */
  | { tipo: 'derrubar_rival'; rivalId: string }
  /** Conquistar `territorios` diferentes de jogadores da `raca` (ou deixar todos eles só com a cidade). */
  | { tipo: 'velha_rixa'; raca: Raca; territorios: number }
  | { tipo: 'populacao'; populacao: number }
  | { tipo: 'senhor_da_guerra'; vitorias: number }
  | { tipo: 'mestre_construtor'; predios: number; nivel: number }
  | { tipo: 'tesouro'; ouro: number }
  /**
   * Não é mais sorteado: virou a vitória aberta a todos (`monopolioComercial`). Fica para as cartas antigas e para
   * quem o tinha tirado na temporada 3 até o servidor sortear outro.
   */
  | { tipo: 'monopolio_comercial'; horas: number };

export type TipoObjetivo = Objetivo['tipo'];

export function objetivoMetadeDoMapa(): Objetivo {
  return { tipo: 'metade_do_mapa' };
}

/**
 * Meta de "metade do mapa": a fração dos territórios que o jogador pode conquistar. Cidades principais dos
 * outros nunca são conquistadas, então ficam fora; assim a meta não fica mais difícil a cada jogador que entra.
 */
export function metaMetadeDoMapa(totalTerritorios: number, cidadesAlheias: number): number {
  return Math.ceil((totalTerritorios - cidadesAlheias) * BALANCEAMENTO.objetivos.fracaoMetadeDoMapa);
}

/**
 * Sorteia o objetivo de um jogador. Prefere tipos que ninguém tirou ainda, para variar; "velha rixa" só sai
 * se outro jogador tiver uma raça diferente da sua; a dupla de regiões tem tamanho parecido com as outras metas.
 */
export function sortearObjetivo(entrada: {
  semente: number;
  /** Regiões do mapa e quantos territórios cada uma tem. */
  regioes: { id: string; territorios: number }[];
  totalTerritorios: number;
  /** Raças dos outros jogadores desta temporada que são diferentes da do jogador (alvos da "velha rixa"). */
  racasRivais?: Raca[];
  /** Objetivos já sorteados para outros jogadores. */
  jaSorteados: Objetivo[];
}): Objetivo {
  const { regioes, totalTerritorios, jaSorteados } = entrada;
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
  const racasUsadas = new Set(jaSorteados.flatMap((o) => (o.tipo === 'velha_rixa' ? [o.raca] : [])));
  const racasRivais = [...new Set(entrada.racasRivais ?? [])].sort();
  const racasLivres = racasRivais.filter((r) => !racasUsadas.has(r));
  const racasAlvo = racasLivres.length > 0 ? racasLivres : racasRivais;

  const possiveis: Exclude<TipoObjetivo, 'derrubar_rival' | 'monopolio_comercial'>[] = [
    'metade_do_mapa',
    'territorios_defendidos',
    'populacao',
    'senhor_da_guerra',
    'mestre_construtor',
    'tesouro',
  ];
  if (duplasLivres.length > 0) possiveis.push('duas_regioes');
  if (racasAlvo.length > 0) possiveis.push('velha_rixa');
  const tiposUsados = new Set(jaSorteados.map((o) => o.tipo));
  const novos = possiveis.filter((t) => !tiposUsados.has(t));

  switch (escolher(novos.length > 0 ? novos : possiveis)) {
    case 'duas_regioes':
      return { tipo: 'duas_regioes', regioes: escolher(duplasLivres) };
    case 'velha_rixa':
      return { tipo: 'velha_rixa', raca: escolher(racasAlvo), territorios: config.rixaTerritorios };
    case 'territorios_defendidos':
      return {
        tipo: 'territorios_defendidos',
        territorios: Math.min(config.territoriosDefendidos, totalTerritorios),
        guarnicaoMinima: config.guarnicaoMinima,
      };
    case 'populacao':
      return { tipo: 'populacao', populacao: config.populacaoAlvo };
    case 'senhor_da_guerra':
      return { tipo: 'senhor_da_guerra', vitorias: config.vitoriasContraJogadores };
    case 'mestre_construtor':
      return { tipo: 'mestre_construtor', predios: config.mestreConstrutorPredios, nivel: config.mestreConstrutorNivel };
    case 'tesouro':
      return { tipo: 'tesouro', ouro: config.ouroGuardado };
    case 'metade_do_mapa':
      return objetivoMetadeDoMapa();
  }
}

export type SituacaoJogador = {
  /** Territórios do jogador, com a região e quantas tropas dele estão lá. */
  meusTerritorios: { id: string; regiaoId: string; minhasTropas: number }[];
  territoriosPorRegiao: ReadonlyMap<string, number>;
  /**
   * Cidades principais de outros jogadores em cada região. Nunca podem ser conquistadas, então ficam fora de
   * "duas regiões" (inclusive a de quem entrar no meio da temporada e cair numa delas).
   */
  cidadesAlheiasPorRegiao: ReadonlyMap<string, number>;
  totalTerritorios: number;
  populacao: number;
  /** Batalhas vencidas contra outros jogadores, atacando ou defendendo (bárbaros não contam). */
  vitoriasContraJogadores: number;
  /** Nível de cada prédio da cidade. */
  niveisPredios: readonly number[];
  ouro: number;
  /** Cidades livres do mapa: se são do jogador e desde quando o dono atual as tem (ms). */
  cidadesLivres: readonly { minha: boolean; posseDesde: number | null }[];
  agora: number;
  /**
   * Só para "velha rixa": territórios diferentes que o jogador já conquistou de jogadores da raça, quantos
   * jogadores dela existem e se todos estão só com a cidade principal.
   */
  rixa?: { territoriosConquistados: number; jogadoresDaRaca: number; todosSoNaCidade: boolean };
  /** Só para "derrubar rival". */
  rival?: { territorios: number; conquisteiDele: boolean; outrosConquistaramDele: boolean };
};

/** Cidades principais de outros jogadores em cada região (para `SituacaoJogador.cidadesAlheiasPorRegiao`). */
export function cidadesAlheiasPorRegiao(
  territorios: readonly { regiaoId: string; donoId: string | null; cidadePrincipal: boolean }[],
  jogadorId: string,
): Map<string, number> {
  const contagem = new Map<string, number>();
  for (const t of territorios) {
    if (t.cidadePrincipal && t.donoId && t.donoId !== jogadorId) contagem.set(t.regiaoId, (contagem.get(t.regiaoId) ?? 0) + 1);
  }
  return contagem;
}

export type AvaliacaoObjetivo = {
  cumprido: boolean;
  /** Quanto falta, para a barra de progresso. */
  atual: number;
  alvo: number;
  /** "Derrubar rival" vira "metade do mapa" se outro jogador derrubar o rival antes (GDD). */
  viraObjetivo?: Objetivo;
  /**
   * Contagem à parte da barra: em "mestre construtor", prédios que já chegaram ao nível pedido (a barra soma os
   * níveis); em "monopólio comercial", cidades livres do jogador (a barra conta as horas).
   */
  partes?: { atual: number; alvo: number }[];
};

export function avaliarObjetivo(objetivo: Objetivo, s: SituacaoJogador): AvaliacaoObjetivo {
  switch (objetivo.tipo) {
    case 'duas_regioes': {
      const alvo = objetivo.regioes.reduce(
        (soma, r) => soma + (s.territoriosPorRegiao.get(r) ?? 0) - (s.cidadesAlheiasPorRegiao.get(r) ?? 0),
        0,
      );
      const atual = s.meusTerritorios.filter((t) => objetivo.regioes.includes(t.regiaoId)).length;
      return { cumprido: alvo > 0 && atual >= alvo, atual, alvo };
    }
    case 'metade_do_mapa': {
      const atual = s.meusTerritorios.length;
      const cidadesAlheias = [...s.cidadesAlheiasPorRegiao.values()].reduce((soma, n) => soma + n, 0);
      const alvo = metaMetadeDoMapa(s.totalTerritorios, cidadesAlheias);
      return { cumprido: atual >= alvo, atual, alvo };
    }
    case 'territorios_defendidos': {
      const atual = s.meusTerritorios.filter((t) => t.minhasTropas >= objetivo.guarnicaoMinima).length;
      return { cumprido: atual >= objetivo.territorios, atual, alvo: objetivo.territorios };
    }
    case 'populacao': {
      const atual = Math.floor(s.populacao);
      return { cumprido: atual >= objetivo.populacao, atual, alvo: objetivo.populacao };
    }
    case 'senhor_da_guerra': {
      const atual = s.vitoriasContraJogadores;
      return { cumprido: atual >= objetivo.vitorias, atual, alvo: objetivo.vitorias };
    }
    case 'mestre_construtor': {
      const prontos = s.niveisPredios.filter((n) => n >= objetivo.nivel).length;
      // Barra de progresso: níveis somados dos prédios mais altos, até o nível pedido em cada um.
      const atual = [...s.niveisPredios]
        .sort((a, b) => b - a)
        .slice(0, objetivo.predios)
        .reduce((soma, n) => soma + Math.min(n, objetivo.nivel), 0);
      return {
        cumprido: prontos >= objetivo.predios,
        atual,
        alvo: objetivo.predios * objetivo.nivel,
        partes: [{ atual: prontos, alvo: objetivo.predios }],
      };
    }
    case 'tesouro': {
      const atual = Math.floor(s.ouro);
      return { cumprido: atual >= objetivo.ouro, atual, alvo: objetivo.ouro };
    }
    case 'monopolio_comercial': {
      const minhas = s.cidadesLivres.filter((c) => c.minha);
      const todas = s.cidadesLivres.length > 0 && minhas.length === s.cidadesLivres.length;
      // O relógio do monopólio começa quando a última cidade livre passou para o jogador.
      const desde = todas ? Math.max(...minhas.map((c) => c.posseDesde ?? s.agora)) : null;
      const horas = desde === null ? 0 : Math.max(0, (s.agora - desde) / HORA_MS);
      return {
        cumprido: todas && horas >= objetivo.horas,
        atual: Math.min(objetivo.horas, Math.floor(horas)),
        alvo: objetivo.horas,
        partes: [{ atual: minhas.length, alvo: s.cidadesLivres.length }],
      };
    }
    case 'velha_rixa': {
      const rixa = s.rixa ?? { territoriosConquistados: 0, jogadoresDaRaca: 1, todosSoNaCidade: false };
      const atual = Math.min(rixa.territoriosConquistados, objetivo.territorios);
      // Raça que sumiu do mapa (contas apagadas): vira "metade do mapa", como o antigo "derrubar rival".
      if (rixa.jogadoresDaRaca === 0) return { cumprido: false, atual, alvo: objetivo.territorios, viraObjetivo: objetivoMetadeDoMapa() };
      const derrubados = rixa.todosSoNaCidade && rixa.territoriosConquistados > 0;
      return { cumprido: atual >= objetivo.territorios || derrubados, atual, alvo: objetivo.territorios };
    }
    case 'derrubar_rival': {
      const rival = s.rival ?? { territorios: 1, conquisteiDele: false, outrosConquistaramDele: false };
      // Progresso: territórios que o rival ainda tem além da cidade principal (zero = derrubado).
      const atual = Math.max(0, rival.territorios - 1);
      const derrubado = rival.territorios <= 1;
      if (derrubado && rival.conquisteiDele) return { cumprido: true, atual, alvo: 0 };
      if (derrubado && rival.outrosConquistaramDele) {
        return { cumprido: false, atual, alvo: 0, viraObjetivo: objetivoMetadeDoMapa() };
      }
      return { cumprido: false, atual, alvo: 0 };
    }
  }
}

/** Situação do monopólio comercial: quem tem todas as cidades livres, desde quando e quando vence. */
export type Monopolio = { donoId: string; desde: number; venceEm: number; cumprido: boolean };

/**
 * Monopólio comercial, a vitória aberta a todos: quem controlar todas as cidades livres do mapa ao mesmo tempo
 * por `monopolioHoras` seguidas vence a temporada. O relógio começa quando a última delas passou para o dono
 * (`posseDesde`) e zera se ele perder qualquer uma. Null se ninguém tem todas.
 */
export function monopolioComercial(
  cidadesLivres: readonly { donoId: string | null; posseDesde: number | null }[],
  agora: number,
): Monopolio | null {
  const donoId = cidadesLivres[0]?.donoId ?? null;
  if (donoId === null || cidadesLivres.some((c) => c.donoId !== donoId)) return null;
  const desde = Math.max(...cidadesLivres.map((c) => c.posseDesde ?? agora));
  const venceEm = desde + BALANCEAMENTO.objetivos.monopolioHoras * HORA_MS;
  return { donoId, desde, venceEm, cumprido: agora >= venceEm };
}

/** Pontos do placar. `vitoriasContraHerdeiro` (cabeça a prêmio) já estão contadas em `vitorias` e valem a mais. */
export function pontuar(entrada: { territorios: number; populacao: number; vitorias: number; vitoriasContraHerdeiro?: number }): number {
  const { porTerritorio, porHabitante, porVitoria } = BALANCEAMENTO.pontos;
  return (
    entrada.territorios * porTerritorio +
    Math.floor(entrada.populacao) * porHabitante +
    entrada.vitorias * porVitoria +
    (entrada.vitoriasContraHerdeiro ?? 0) * BALANCEAMENTO.herdeiro.pontosPorVitoria
  );
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
