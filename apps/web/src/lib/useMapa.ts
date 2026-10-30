import { exercito, somarExercitos, type Exercito, type Recurso, type Recursos, type Terreno, type TipoUnidade } from '@terra/regras';
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
  tipo: 'saque' | 'conquista' | 'retorno';
  tropas: Exercito;
  saque: Recursos;
  chegadaEm: number;
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
};

export const COR_NEUTRA = '#6b5a48';

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

async function buscarMapa(): Promise<DadosMapa | null> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, numero, inicio')
    .eq('status', 'ativa')
    .maybeSingle<{ id: string; numero: number; inicio: string }>();
  if (!temporada) return null;

  const [regioes, territorios, fronteiras, jogadores, tropas, marchas, protecoes, minhaCidade] = await Promise.all([
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
  ]);
  if (!regioes.data || !territorios.data || !fronteiras.data || !jogadores.data || !tropas.data || !marchas.data || !protecoes.data) {
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

  return { dados, erro, recarregar };
}
