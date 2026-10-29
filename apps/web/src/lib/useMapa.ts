import type { Recurso, Terreno } from '@terra/regras';
import { useEffect, useState } from 'react';
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

export type DadosMapa = {
  temporada: { id: string; numero: number };
  regioes: Map<string, RegiaoMapa>;
  territorios: TerritorioMapa[];
  vizinhos: Map<string, string[]>;
  jogadores: Map<string, JogadorMapa>;
};

export const COR_NEUTRA = '#6b5a48';

async function buscarMapa(): Promise<DadosMapa | null> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase
    .from('temporadas')
    .select('id, numero')
    .eq('status', 'ativa')
    .maybeSingle<{ id: string; numero: number }>();
  if (!temporada) return null;

  const [regioes, territorios, fronteiras, jogadores] = await Promise.all([
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
  ]);
  if (!regioes.data || !territorios.data || !fronteiras.data || !jogadores.data) {
    throw new Error('Não foi possível carregar o mapa.');
  }
  if (territorios.data.length === 0) return null;

  const vizinhos = new Map<string, string[]>();
  for (const { territorio_a: a, territorio_b: b } of fronteiras.data) {
    vizinhos.set(a, [...(vizinhos.get(a) ?? []), b]);
    vizinhos.set(b, [...(vizinhos.get(b) ?? []), a]);
  }
  return {
    temporada,
    regioes: new Map(regioes.data.map((r) => [r.id, r])),
    territorios: territorios.data,
    vizinhos,
    jogadores: new Map(jogadores.data.map((j) => [j.id, j])),
  };
}

/** Mapa da temporada ativa. `null` em `dados` quando a temporada não tem mapa. */
export function useMapa() {
  const [dados, setDados] = useState<DadosMapa | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    buscarMapa()
      .then(setDados)
      .catch((e: unknown) => setErro(e instanceof Error ? e.message : 'Erro ao carregar o mapa.'));
  }, []);

  return { dados, erro };
}
