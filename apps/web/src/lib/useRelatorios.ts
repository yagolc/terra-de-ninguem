import type { Exercito, Recursos, Terreno } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

/** Formato de `relatorios.dados`, gravado pela função resolver-marchas. */
export type DadosBatalha = {
  terreno: Terreno;
  cidadePrincipal: boolean;
  muralha: number;
  forcaAtaque: number;
  forcaDefesa: number;
  margem: number | null;
  atacante: Exercito;
  defensor: Exercito;
  perdasAtacante: Exercito;
  perdasDefensor: Exercito;
  saque: Recursos;
};

export type Relatorio = {
  id: string;
  tipo: 'saque' | 'conquista';
  atacante_id: string;
  defensor_id: string | null;
  origem_id: string;
  territorio_id: string;
  vencedor: 'atacante' | 'defensor';
  conquistou: boolean;
  dados: DadosBatalha;
  criado_em: string;
  lido_atacante: boolean;
  lido_defensor: boolean;
};

type Contexto = { nomesTerritorios: Map<string, string>; nomesJogadores: Map<string, string> };

async function buscar(): Promise<{ relatorios: Relatorio[] } & Contexto> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
  if (!temporada) return { relatorios: [], nomesTerritorios: new Map(), nomesJogadores: new Map() };

  const [relatorios, territorios, jogadores] = await Promise.all([
    supabase
      .from('relatorios')
      .select('id, tipo, atacante_id, defensor_id, origem_id, territorio_id, vencedor, conquistou, dados, criado_em, lido_atacante, lido_defensor')
      .eq('temporada_id', temporada.id)
      .order('criado_em', { ascending: false })
      .limit(100)
      .returns<Relatorio[]>(),
    supabase.from('territorios').select('id, nome').eq('temporada_id', temporada.id).returns<{ id: string; nome: string }[]>(),
    supabase.from('jogadores').select('id, nome').returns<{ id: string; nome: string }[]>(),
  ]);
  if (!relatorios.data || !territorios.data || !jogadores.data) throw new Error('Não foi possível carregar os relatórios.');
  return {
    relatorios: relatorios.data,
    nomesTerritorios: new Map(territorios.data.map((t) => [t.id, t.nome])),
    nomesJogadores: new Map(jogadores.data.map((j) => [j.id, j.nome])),
  };
}

/** Relatórios de batalha da temporada ativa (só os do próprio jogador, pelo RLS). Marca como lidos ao abrir. */
export function useRelatorios() {
  const [estado, setEstado] = useState<({ relatorios: Relatorio[] } & Contexto) | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await buscar();
      setEstado(dados);
      if (dados.relatorios.length > 0) void chamarFuncao('cidade', { acao: 'marcar_relatorios_lidos' }).catch(() => {});
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os relatórios.');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { estado, erro, recarregar: carregar };
}

/** Quantos relatórios o jogador ainda não leu (para o aviso na aba). */
export async function contarNaoLidos(jogadorId: string): Promise<number> {
  if (!supabase) return 0;
  const [comoAtacante, comoDefensor] = await Promise.all([
    supabase.from('relatorios').select('id', { count: 'exact', head: true }).eq('atacante_id', jogadorId).eq('lido_atacante', false),
    supabase.from('relatorios').select('id', { count: 'exact', head: true }).eq('defensor_id', jogadorId).eq('lido_defensor', false),
  ]);
  return (comoAtacante.count ?? 0) + (comoDefensor.count ?? 0);
}
