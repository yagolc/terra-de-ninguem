import {
  CORES_JOGADORES,
  exercito,
  somarExercitos,
  type Especialidade,
  type Exercito,
  type Heroi,
  type Raca,
  type Recurso,
  type Recursos,
  type Terreno,
  type TipoEstrutura,
  type TipoPovoado,
  type TipoUnidade,
} from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

export type RegiaoMapa = { id: string; indice: number; nome: string; terreno: Terreno };
export type TerritorioMapa = {
  id: string;
  regiao_id: string;
  indice: number;
  nome: string;
  terreno: Terreno;
  bonus_recurso: Recurso;
  x: number;
  y: number;
  poligono: [number, number][];
  dono_id: string | null;
  cidade_principal: boolean;
  reservado_para: string | null;
};
export type JogadorMapa = { id: string; nome: string; cor: string | null };

export type MarchaMapa = {
  id: string;
  origemId: string;
  destinoId: string;
  tipo: 'saque' | 'conquista' | 'retorno' | 'movimento' | 'reconhecimento';
  tropas: Exercito;
  saque: Recursos;
  chegadaEm: number;
};

/**
 * Estrutura de um território. As do jogador vêm com tipo e prazo (antes de `prontoEm` está em construção);
 * as dos outros são secretas: só se sabe que existem (tipo e prazo nulos) até um batedor ver.
 */
export type EstruturaMapa =
  | { territorioId: string; tipo: TipoEstrutura; prontoEm: number }
  | { territorioId: string; tipo: null; prontoEm: null };

/** Vila ou cidade livre de um território (públicas: todos veem nível, estoque e lealdade). O dono é o do território. */
export type PovoadoMapa = {
  territorioId: string;
  tipo: TipoPovoado;
  nivel: number;
  /** Vila neutra: o estoque volta a encher a partir daqui (null = nunca saqueada, cheia). */
  saqueadaEm: number | null;
  posseDesde: number | null;
  /** Dá bônus ao dono a partir daqui (null = nunca teve dono). */
  lealDesde: number | null;
  /** Lanceiros de milícia que defendem a cidade livre para o dono (fora da população). */
  milicia: number;
  miliciaEntregue: boolean;
};

type LinhaPovoado = {
  territorio_id: string;
  tipo: TipoPovoado;
  nivel: number;
  saqueada_em: string | null;
  posse_desde: string | null;
  leal_desde: string | null;
  milicia: number;
  milicia_entregue: boolean;
};

const data = (valor: string | null) => (valor ? Date.parse(valor) : null);

/** Marcha alheia vindo para um território do jogador com torre de vigia pronta (só o total de soldados). */
export type MarchaVista = {
  id: string;
  jogadorId: string;
  origemId: string;
  destinoId: string;
  tipo: 'saque' | 'conquista' | 'reconhecimento';
  soldados: number;
  chegadaEm: number;
};

/** O que um batedor viu num território (só os do próprio jogador, depois que o batedor voltou). */
export type Reconhecimento = {
  territorioId: string;
  donoId: string | null;
  terreno: Terreno;
  muralha: number;
  tropas: Exercito;
  /** Estrutura que o batedor viu (nula se não havia) e se já estava pronta. */
  estrutura: TipoEstrutura | null;
  estruturaPronta: boolean;
  /** Herói que o batedor viu no território, se havia um. */
  heroi: { nome: string; especialidade: Especialidade; nivel: number } | null;
  observadoEm: number;
  disponivelEm: number;
  lido: boolean;
};

export type DadosMapa = {
  temporada: { id: string; numero: number; inicio: number };
  regioes: Map<string, RegiaoMapa>;
  territorios: TerritorioMapa[];
  vizinhos: Map<string, string[]>;
  jogadores: Map<string, JogadorMapa>;
  /** Tropas do próprio jogador por território (o RLS esconde as dos outros e as dos bárbaros). */
  minhasTropas: Map<string, Exercito>;
  /** Marchas do próprio jogador ainda a caminho. */
  marchas: MarchaMapa[];
  /** Fim do escudo de cada jogador protegido. */
  escudos: Map<string, number>;
  /** Último reconhecimento de cada território. */
  reconhecimentos: Map<string, Reconhecimento>;
  /** Estrutura de cada território que tem uma. */
  estruturas: Map<string, EstruturaMapa>;
  /** Marchas alheias vistas pelas torres do jogador, da que chega primeiro para a última. */
  marchasVistas: MarchaVista[];
  /** Vila ou cidade livre de cada território que tem uma. */
  povoados: Map<string, PovoadoMapa>;
  /** O herói do próprio jogador (o dos outros é secreto). */
  heroi: Heroi | null;
  /** Raça de cada jogador da temporada (pública). */
  racas: Map<string, Raca>;
  /** Vencedor da temporada anterior: o herdeiro do trono caído (coroa no mapa, cabeça a prêmio). */
  herdeiroId: string | null;
};

export const COR_NEUTRA = '#6b5a48';

/** Cor do jogador no mapa; se ainda não tiver uma gravada, uma da paleta escolhida pelo id (nunca o marrom neutro). */
export function corDoJogador(jogador: { id: string; cor: string | null }): string {
  if (jogador.cor) return jogador.cor;
  const indice = [...jogador.id].reduce((soma, c) => soma + c.charCodeAt(0), 0) % CORES_JOGADORES.length;
  return CORES_JOGADORES[indice]!;
}

type LinhaMarcha = {
  id: string;
  origem_id: string;
  destino_id: string;
  tipo: MarchaMapa['tipo'];
  lanceiro: number;
  arqueiro: number;
  cavalaria: number;
  saque_comida: number;
  saque_madeira: number;
  saque_ouro: number;
  chegada_em: string;
};

type LinhaReconhecimento = {
  territorio_id: string;
  dono_id: string | null;
  terreno: Terreno;
  muralha: number;
  lanceiro: number;
  arqueiro: number;
  cavalaria: number;
  estrutura: TipoEstrutura | null;
  estrutura_pronta: boolean;
  heroi: { nome: string; especialidade: Especialidade; nivel: number } | null;
  observado_em: string;
  disponivel_em: string;
  lido: boolean;
};

type LinhaEstrutura = { territorio_id: string; tipo: TipoEstrutura | null; pronto_em: string | null };

type LinhaMarchaVista = {
  id: string;
  jogador_id: string;
  origem_id: string;
  destino_id: string;
  tipo: MarchaVista['tipo'];
  soldados: number;
  chegada_em: string;
};

/** Marchas alheias que as torres do jogador enxergam (a função do banco filtra; o RLS esconde o resto). */
export async function buscarMarchasVistas(): Promise<MarchaVista[]> {
  if (!supabase) return [];
  const { data } = await supabase.rpc('marchas_vistas_pela_torre');
  return ((data ?? []) as LinhaMarchaVista[])
    .map((m) => ({
      id: m.id,
      jogadorId: m.jogador_id,
      origemId: m.origem_id,
      destinoId: m.destino_id,
      tipo: m.tipo,
      soldados: m.soldados,
      chegadaEm: Date.parse(m.chegada_em),
    }))
    .sort((a, b) => a.chegadaEm - b.chegadaEm);
}

/** Reconhecimentos do jogador na temporada, do mais recente para o mais antigo (o RLS só devolve os que já voltaram). */
export async function buscarReconhecimentos(temporadaId: string): Promise<Reconhecimento[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('reconhecimentos')
    .select(
      'territorio_id, dono_id, terreno, muralha, lanceiro, arqueiro, cavalaria, estrutura, estrutura_pronta, heroi, observado_em, disponivel_em, lido',
    )
    .eq('temporada_id', temporadaId)
    .order('observado_em', { ascending: false })
    .limit(100)
    .returns<LinhaReconhecimento[]>();
  return (data ?? []).map((r) => ({
    territorioId: r.territorio_id,
    donoId: r.dono_id,
    terreno: r.terreno,
    muralha: r.muralha,
    tropas: exercito({ lanceiro: r.lanceiro, arqueiro: r.arqueiro, cavalaria: r.cavalaria }),
    estrutura: r.estrutura,
    estruturaPronta: r.estrutura_pronta,
    heroi: r.heroi,
    observadoEm: Date.parse(r.observado_em),
    disponivelEm: Date.parse(r.disponivel_em),
    lido: r.lido,
  }));
}

async function buscarMapa(): Promise<DadosMapa | null> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, numero, inicio')
    .eq('status', 'ativa')
    .maybeSingle<{ id: string; numero: number; inicio: string }>();
  if (!temporada) return null;

  const [
    regioes,
    territorios,
    fronteiras,
    jogadores,
    tropas,
    marchas,
    protecoes,
    minhaCidade,
    reconhecimentos,
    estruturas,
    marchasVistas,
    povoados,
    heroi,
    racas,
    anterior,
  ] = await Promise.all([
    supabase.from('regioes').select('id, indice, nome, terreno').eq('temporada_id', temporada.id).returns<RegiaoMapa[]>(),
    supabase
      .from('territorios')
      .select('id, regiao_id, indice, nome, terreno, bonus_recurso, x, y, poligono, dono_id, cidade_principal, reservado_para')
      .eq('temporada_id', temporada.id)
      .order('indice')
      .returns<TerritorioMapa[]>(),
    supabase
      .from('fronteiras')
      .select('territorio_a, territorio_b')
      .eq('temporada_id', temporada.id)
      .returns<{ territorio_a: string; territorio_b: string }[]>(),
    supabase.from('jogadores').select('id, nome, cor').returns<JogadorMapa[]>(),
    supabase
      .from('tropas')
      .select('territorio_id, lanceiro, arqueiro, cavalaria')
      .eq('temporada_id', temporada.id)
      .returns<{ territorio_id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>(),
    supabase
      .from('marchas')
      .select('id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria, saque_comida, saque_madeira, saque_ouro, chegada_em')
      .eq('temporada_id', temporada.id)
      .eq('status', 'a_caminho')
      .order('chegada_em')
      .returns<LinhaMarcha[]>(),
    supabase
      .from('protecoes')
      .select('jogador_id, ate')
      .eq('temporada_id', temporada.id)
      .returns<{ jogador_id: string; ate: string }[]>(),
    // O RLS devolve só a própria cidade.
    supabase
      .from('cidades')
      .select('territorio_id, filas_treino(tipo_unidade, quantidade, pronto_em)')
      .eq('temporada_id', temporada.id)
      .maybeSingle<{
        territorio_id: string | null;
        filas_treino: { tipo_unidade: TipoUnidade; quantidade: number; pronto_em: string }[];
      }>(),
    buscarReconhecimentos(temporada.id),
    // Tipo e prazo só nas estruturas do próprio jogador; nas outras, nulos (o batedor descobre).
    supabase.rpc('estruturas_no_mapa', { p_temporada: temporada.id }),
    buscarMarchasVistas(),
    supabase
      .from('povoados')
      .select('territorio_id, tipo, nivel, saqueada_em, posse_desde, leal_desde, milicia, milicia_entregue')
      .eq('temporada_id', temporada.id)
      .returns<LinhaPovoado[]>(),
    supabase
      .from('herois')
      .select('nome, especialidade, nivel, territorio_id, marcha_id, treino_pronto_em, ferido_ate')
      .eq('temporada_id', temporada.id)
      .maybeSingle<{
        nome: string;
        especialidade: Especialidade;
        nivel: number;
        territorio_id: string | null;
        marcha_id: string | null;
        treino_pronto_em: string | null;
        ferido_ate: string | null;
      }>(),
    supabase.rpc('racas_na_temporada', { p_temporada: temporada.id }),
    supabase
      .from('temporadas')
      .select('vencedor_id')
      .eq('status', 'encerrada')
      .order('numero', { ascending: false })
      .limit(1)
      .returns<{ vencedor_id: string | null }[]>(),
  ]);
  if (
    !regioes.data ||
    !territorios.data ||
    !fronteiras.data ||
    !jogadores.data ||
    !tropas.data ||
    !marchas.data ||
    !protecoes.data ||
    !estruturas.data ||
    !povoados.data
  ) {
    throw new Error('Não foi possível carregar o mapa.');
  }
  if (territorios.data.length === 0) return null;

  // Tropas paradas, mais os lotes de treino que já ficaram prontos e o servidor ainda não gravou
  // (ele grava em até um minuto): entram no território da cidade, como a tela Cidade já mostra.
  const minhasTropas = new Map(tropas.data.map(({ territorio_id, ...t }) => [territorio_id, exercito(t)]));
  const cidade = minhaCidade.data;
  if (cidade?.territorio_id) {
    const prontos = cidade.filas_treino.filter((l) => Date.parse(l.pronto_em) <= Date.now());
    if (prontos.length > 0) {
      const atual = minhasTropas.get(cidade.territorio_id) ?? exercito();
      minhasTropas.set(
        cidade.territorio_id,
        somarExercitos(atual, ...prontos.map((l) => exercito({ [l.tipo_unidade]: l.quantidade }))),
      );
    }
  }

  const vizinhos = new Map<string, string[]>();
  for (const { territorio_a: a, territorio_b: b } of fronteiras.data) {
    vizinhos.set(a, [...(vizinhos.get(a) ?? []), b]);
    vizinhos.set(b, [...(vizinhos.get(b) ?? []), a]);
  }
  return {
    temporada: { id: temporada.id, numero: temporada.numero, inicio: Date.parse(temporada.inicio) },
    regioes: new Map(regioes.data.map((r) => [r.id, r])),
    territorios: territorios.data,
    vizinhos,
    jogadores: new Map(jogadores.data.map((j) => [j.id, j])),
    minhasTropas,
    marchas: marchas.data.map((m) => ({
      id: m.id,
      origemId: m.origem_id,
      destinoId: m.destino_id,
      tipo: m.tipo,
      tropas: exercito({ lanceiro: m.lanceiro, arqueiro: m.arqueiro, cavalaria: m.cavalaria }),
      saque: { comida: m.saque_comida, madeira: m.saque_madeira, ouro: m.saque_ouro },
      chegadaEm: Date.parse(m.chegada_em),
    })),
    escudos: new Map(protecoes.data.map((p) => [p.jogador_id, Date.parse(p.ate)])),
    // Já vêm do mais recente para o mais antigo: o primeiro de cada território fica.
    reconhecimentos: new Map([...reconhecimentos].reverse().map((r) => [r.territorioId, r])),
    estruturas: new Map(
      (estruturas.data as LinhaEstrutura[]).map((e): [string, EstruturaMapa] => [
        e.territorio_id,
        e.tipo && e.pronto_em
          ? { territorioId: e.territorio_id, tipo: e.tipo, prontoEm: Date.parse(e.pronto_em) }
          : { territorioId: e.territorio_id, tipo: null, prontoEm: null },
      ]),
    ),
    marchasVistas,
    povoados: new Map(
      povoados.data.map((p): [string, PovoadoMapa] => [
        p.territorio_id,
        {
          territorioId: p.territorio_id,
          tipo: p.tipo,
          nivel: p.nivel,
          saqueadaEm: data(p.saqueada_em),
          posseDesde: data(p.posse_desde),
          lealDesde: data(p.leal_desde),
          milicia: p.milicia,
          miliciaEntregue: p.milicia_entregue,
        },
      ]),
    ),
    racas: new Map(
      ((racas.data ?? []) as { jogador_id: string; raca: Raca | null }[]).flatMap((r): [string, Raca][] =>
        r.raca ? [[r.jogador_id, r.raca]] : [],
      ),
    ),
    herdeiroId: anterior.data?.[0]?.vencedor_id ?? null,
    heroi: heroi.data && {
      nome: heroi.data.nome,
      especialidade: heroi.data.especialidade,
      nivel: heroi.data.nivel,
      territorioId: heroi.data.territorio_id,
      marchaId: heroi.data.marcha_id,
      treinoProntoEm: data(heroi.data.treino_pronto_em),
      feridoAte: data(heroi.data.ferido_ate),
    },
  };
}

/** Mapa da temporada ativa. `null` em `dados` quando a temporada não tem mapa. */
export function useMapa() {
  const [dados, setDados] = useState<DadosMapa | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await buscarMapa());
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o mapa.');
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  // Enquanto houver marchas a caminho, relê o mapa logo depois que a próxima chegar (o servidor resolve
  // as chegadas de minuto em minuto): o território muda de dono e o relatório aparece sem recarregar a página.
  const proximaChegada = dados?.marchas[0]?.chegadaEm;
  useEffect(() => {
    if (!proximaChegada) return;
    const espera = Math.max(5_000, proximaChegada - Date.now() + 70_000);
    const t = setTimeout(() => void recarregar(), espera);
    return () => clearTimeout(t);
  }, [proximaChegada, recarregar]);

  // A torre só serve se o mapa souber de marchas novas: relê a cada minuto enquanto o mapa está aberto.
  useEffect(() => {
    const t = setInterval(() => void recarregar(), 60_000);
    return () => clearInterval(t);
  }, [recarregar]);

  return { dados, erro, recarregar };
}
