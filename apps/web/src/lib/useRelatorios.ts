import type { Especialidade, Exercito, Raca, Recursos, Terreno } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { buscarReconhecimentos, type Reconhecimento } from './useMapa';
import { supabase } from './supabase';

export type HeroiNoRelatorio = { nome: string; especialidade: Especialidade; nivel: number; ferido: boolean };

/** Formato de `relatorios.dados`, gravado pela função resolver-marchas. */
export type DadosBatalha = {
  terreno: Terreno;
  cidadePrincipal: boolean;
  muralha: number;
  /** Ausente nos relatórios de antes das estruturas. */
  palicada?: boolean;
  /** Vila ou cidade livre do território (ausente nos relatórios de antes dos povoados). */
  povoado?: { tipo: 'vila' | 'cidade_livre'; nivel: number } | null;
  /** A vila de um jogador foi saqueada e voltou ao nível 0. */
  vilaZerada?: boolean;
  /** A milícia da cidade livre se juntou ao conquistador. */
  milicia?: boolean;
  /** Heróis de cada lado (ausentes antes dos heróis); `ferido` = perdeu a batalha. */
  heroiAtacante?: HeroiNoRelatorio | null;
  heroiDefensor?: HeroiNoRelatorio | null;
  /** Raças de cada lado e a Guarda Real que defendia (ausentes antes das raças). */
  racaAtacante?: Raca | null;
  racaDefensor?: Raca | null;
  guardaReal?: number;
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

type Contexto = { nomesTerritorios: Map<string, string>; nomesJogadores: Map<string, string>; reconhecimentos: Reconhecimento[] };

async function buscar(): Promise<{ relatorios: Relatorio[] } & Contexto> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
  if (!temporada) return { relatorios: [], nomesTerritorios: new Map(), nomesJogadores: new Map(), reconhecimentos: [] };

  const [relatorios, territorios, jogadores, reconhecimentos] = await Promise.all([
    supabase
      .from('relatorios')
      .select('id, tipo, atacante_id, defensor_id, origem_id, territorio_id, vencedor, conquistou, dados, criado_em, lido_atacante, lido_defensor')
      .eq('temporada_id', temporada.id)
      .order('criado_em', { ascending: false })
      .limit(100)
      .returns<Relatorio[]>(),
    supabase.from('territorios').select('id, nome').eq('temporada_id', temporada.id).returns<{ id: string; nome: string }[]>(),
    supabase.from('jogadores').select('id, nome').returns<{ id: string; nome: string }[]>(),
    buscarReconhecimentos(temporada.id),
  ]);
  if (!relatorios.data || !territorios.data || !jogadores.data) throw new Error('Não foi possível carregar os relatórios.');
  return {
    relatorios: relatorios.data,
    nomesTerritorios: new Map(territorios.data.map((t) => [t.id, t.nome])),
    nomesJogadores: new Map(jogadores.data.map((j) => [j.id, j.nome])),
    reconhecimentos,
  };
}

/** Relatórios de batalha e de batedores da temporada ativa (só os do próprio jogador, pelo RLS). Marca como lidos ao abrir. */
export function useRelatorios() {
  const [estado, setEstado] = useState<({ relatorios: Relatorio[] } & Contexto) | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await buscar();
      setEstado(dados);
      if (dados.relatorios.length > 0 || dados.reconhecimentos.length > 0) void chamarFuncao('cidade', { acao: 'marcar_relatorios_lidos' }).catch(() => {});
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar os relatórios.');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { estado, erro, recarregar: carregar };
}

/**
 * Quantos relatórios da temporada ativa o jogador ainda não leu (para o aviso na aba). Só a ativa, como a tela:
 * relatórios que ficaram sem abrir numa temporada encerrada não contam.
 */
export async function contarNaoLidos(jogadorId: string): Promise<number> {
  if (!supabase) return 0;
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
  if (!temporada) return 0;
  const naTemporada = (tabela: 'relatorios' | 'reconhecimentos') =>
    supabase!.from(tabela).select('id', { count: 'exact', head: true }).eq('temporada_id', temporada.id);
  const [comoAtacante, comoDefensor, batedores] = await Promise.all([
    naTemporada('relatorios').eq('atacante_id', jogadorId).eq('lido_atacante', false),
    naTemporada('relatorios').eq('defensor_id', jogadorId).eq('lido_defensor', false),
    // O RLS só conta batedores que já voltaram.
    naTemporada('reconhecimentos').eq('jogador_id', jogadorId).eq('lido', false),
  ]);
  return (comoAtacante.count ?? 0) + (comoDefensor.count ?? 0) + (batedores.count ?? 0);
}
