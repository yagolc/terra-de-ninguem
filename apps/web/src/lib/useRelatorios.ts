import { exercito, type Especialidade, type Exercito, type Raca, type Recursos, type Terreno, type TipoPet } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { buscarHordas, type Horda } from './hordas';
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
  /** Pet levado no saque: o atacante resgatou o dele ou sequestrou o do defensor. */
  pet?: { acao: 'resgatou' | 'sequestrou'; donoId: string; tipo: TipoPet } | null;
  /** A milícia da cidade livre se juntou ao conquistador. */
  milicia?: boolean;
  /** Era um movimento para um território próprio que caiu no caminho: as tropas lutaram para retomá-lo. */
  retomada?: boolean;
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

/**
 * Tropas que voltaram sem lutar (só o atacante vê): o alvo virou de um jogador na proteção de iniciante, ou o
 * dono fez um pacto de não agressão com o atacante enquanto a marcha andava.
 */
export type Devolvida = {
  id: string;
  motivo: 'protecao_iniciante' | 'pacto';
  territorioId: string;
  origemId: string;
  novoDonoId: string | null;
  tropas: Exercito;
  criadoEm: number;
  lido: boolean;
};

/** Linha como vem do banco: batalha ou tropas devolvidas (sem vencedor). */
type LinhaRelatorio = Omit<Relatorio, 'tipo' | 'vencedor'> & { tipo: Relatorio['tipo'] | 'devolvida'; vencedor: Relatorio['vencedor'] | null };

type Contexto = {
  nomesTerritorios: Map<string, string>;
  nomesJogadores: Map<string, string>;
  reconhecimentos: Reconhecimento[];
  /** Hordas bárbaras já resolvidas (públicas); a tela mostra as que atacaram o jogador. */
  hordas: Horda[];
  devolvidas: Devolvida[];
  /** Territórios com cidade livre (muralha própria) e raça de cada jogador: entram na análise do batedor, como no mapa. */
  cidadesLivres: Set<string>;
  racas: Map<string, Raca>;
};

async function buscar(): Promise<{ relatorios: Relatorio[] } & Contexto> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
  if (!temporada) {
    return {
      relatorios: [],
      nomesTerritorios: new Map(),
      nomesJogadores: new Map(),
      reconhecimentos: [],
      hordas: [],
      devolvidas: [],
      cidadesLivres: new Set(),
      racas: new Map(),
    };
  }

  const [relatorios, territorios, jogadores, reconhecimentos, hordas, cidadesLivres, racas] = await Promise.all([
    supabase
      .from('relatorios')
      .select('id, tipo, atacante_id, defensor_id, origem_id, territorio_id, vencedor, conquistou, dados, criado_em, lido_atacante, lido_defensor')
      .eq('temporada_id', temporada.id)
      .order('criado_em', { ascending: false })
      .limit(100)
      .returns<LinhaRelatorio[]>(),
    supabase.from('territorios').select('id, nome').eq('temporada_id', temporada.id).returns<{ id: string; nome: string }[]>(),
    supabase.from('jogadores').select('id, nome').returns<{ id: string; nome: string }[]>(),
    buscarReconhecimentos(temporada.id),
    buscarHordas(temporada.id, 30),
    supabase
      .from('povoados')
      .select('territorio_id')
      .eq('temporada_id', temporada.id)
      .eq('tipo', 'cidade_livre')
      .returns<{ territorio_id: string }[]>(),
    supabase.rpc('racas_na_temporada', { p_temporada: temporada.id }),
  ]);
  if (!relatorios.data || !territorios.data || !jogadores.data) throw new Error('Não foi possível carregar os relatórios.');
  const batalhas = relatorios.data.filter((r): r is Relatorio => r.tipo !== 'devolvida');
  const devolvidas = relatorios.data
    .filter((r) => r.tipo === 'devolvida')
    .map((r): Devolvida => {
      const dados = r.dados as unknown as { motivo?: string; novoDonoId?: string; tropas?: Exercito };
      return {
        id: r.id,
        motivo: dados.motivo === 'pacto' ? 'pacto' : 'protecao_iniciante',
        territorioId: r.territorio_id,
        origemId: r.origem_id,
        novoDonoId: dados.novoDonoId ?? null,
        tropas: dados.tropas ?? exercito(),
        criadoEm: Date.parse(r.criado_em),
        lido: r.lido_atacante,
      };
    });
  return {
    relatorios: batalhas,
    devolvidas,
    nomesTerritorios: new Map(territorios.data.map((t) => [t.id, t.nome])),
    nomesJogadores: new Map(jogadores.data.map((j) => [j.id, j.nome])),
    reconhecimentos,
    // Só as já resolvidas: a que vem aparece no mapa.
    hordas: hordas.filter((h) => !h.aCaminho),
    cidadesLivres: new Set((cidadesLivres.data ?? []).map((p) => p.territorio_id)),
    racas: new Map(
      ((racas.data ?? []) as { jogador_id: string; raca: Raca | null }[]).flatMap((r): [string, Raca][] =>
        r.raca ? [[r.jogador_id, r.raca]] : [],
      ),
    ),
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
