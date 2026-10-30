import { avaliarObjetivo, type AvaliacaoObjetivo, type Objetivo } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

export type LinhaPlacar = {
  jogadorId: string;
  nome: string;
  cor: string | null;
  territorios: number;
  populacao: number;
  vitorias: number;
  pontos: number;
};

export type TemporadaInfo = {
  id: string;
  numero: number;
  inicio: number;
  fimPrevisto: number | null;
  status: 'ativa' | 'encerrada';
  vencedorId: string | null;
  motivoFim: 'objetivo' | 'prazo' | null;
  encerradaEm: number | null;
};

export type DadosTemporada = {
  temporada: TemporadaInfo;
  meuObjetivo: Objetivo | null;
  /** Calculado no navegador com as mesmas regras do servidor (a população vem do placar). */
  progresso: AvaliacaoObjetivo | null;
  /** Todos os objetivos, só depois que a temporada acaba. */
  revelados: { jogadorId: string; objetivo: Objetivo; cumpridoEm: string | null }[];
  placar: LinhaPlacar[];
  nomeRegiao: (id: string) => string;
  nomeJogador: (id: string) => string;
  historico: { numero: number; vencedor: string | null; motivoFim: 'objetivo' | 'prazo' | null; encerradaEm: number | null }[];
};

type LinhaTemporada = {
  id: string;
  numero: number;
  inicio: string;
  fim_previsto: string | null;
  status: 'ativa' | 'encerrada';
  vencedor_id: string | null;
  motivo_fim: 'objetivo' | 'prazo' | null;
  encerrada_em: string | null;
};

const converterTemporada = (t: LinhaTemporada): TemporadaInfo => ({
  id: t.id,
  numero: t.numero,
  inicio: Date.parse(t.inicio),
  fimPrevisto: t.fim_previsto ? Date.parse(t.fim_previsto) : null,
  status: t.status,
  vencedorId: t.vencedor_id,
  motivoFim: t.motivo_fim,
  encerradaEm: t.encerrada_em ? Date.parse(t.encerrada_em) : null,
});

async function buscar(jogadorId: string): Promise<DadosTemporada | null> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  // A temporada ativa ou, se nenhuma estiver ativa, a última encerrada.
  const { data: temporadas, error } = await supabase
    .from('temporadas')
    .select('id, numero, inicio, fim_previsto, status, vencedor_id, motivo_fim, encerrada_em')
    .order('numero', { ascending: false })
    .returns<LinhaTemporada[]>();
  if (error || !temporadas) throw new Error('Não foi possível carregar a temporada.');
  const linha = temporadas.find((t) => t.status === 'ativa') ?? temporadas.find((t) => t.status === 'encerrada');
  if (!linha) return null;
  const temporada = converterTemporada(linha);

  const [jogadores, regioes, placar, objetivos, territorios, tropas, conquistas] = await Promise.all([
    supabase.from('jogadores').select('id, nome, cor').returns<{ id: string; nome: string; cor: string | null }[]>(),
    supabase.from('regioes').select('id, nome').eq('temporada_id', temporada.id).returns<{ id: string; nome: string }[]>(),
    supabase
      .from('placar')
      .select('jogador_id, territorios, populacao, vitorias, pontos')
      .eq('temporada_id', temporada.id)
      .order('pontos', { ascending: false })
      .returns<{ jogador_id: string; territorios: number; populacao: number; vitorias: number; pontos: number }[]>(),
    // O RLS devolve só o meu objetivo, ou todos depois que a temporada acaba.
    supabase
      .from('objetivos')
      .select('jogador_id, objetivo, cumprido_em')
      .eq('temporada_id', temporada.id)
      .returns<{ jogador_id: string; objetivo: Objetivo; cumprido_em: string | null }[]>(),
    supabase
      .from('territorios')
      .select('id, regiao_id, dono_id')
      .eq('temporada_id', temporada.id)
      .returns<{ id: string; regiao_id: string; dono_id: string | null }[]>(),
    supabase
      .from('tropas')
      .select('territorio_id, lanceiro, arqueiro, cavalaria')
      .eq('temporada_id', temporada.id)
      .eq('dono_id', jogadorId)
      .returns<{ territorio_id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>(),
    supabase
      .from('relatorios')
      .select('defensor_id')
      .eq('temporada_id', temporada.id)
      .eq('atacante_id', jogadorId)
      .eq('conquistou', true)
      .returns<{ defensor_id: string | null }[]>(),
  ]);
  if (!jogadores.data || !regioes.data || !placar.data || !objetivos.data || !territorios.data || !tropas.data || !conquistas.data) {
    throw new Error('Não foi possível carregar o placar.');
  }

  const nomesJogadores = new Map(jogadores.data.map((j) => [j.id, j]));
  const nomesRegioes = new Map(regioes.data.map((r) => [r.id, r.nome]));
  const nomeJogador = (id: string) => nomesJogadores.get(id)?.nome ?? 'um jogador';
  const meuObjetivo = objetivos.data.find((o) => o.jogador_id === jogadorId)?.objetivo ?? null;

  let progresso: AvaliacaoObjetivo | null = null;
  if (meuObjetivo) {
    const territoriosPorRegiao = new Map<string, number>();
    for (const t of territorios.data) territoriosPorRegiao.set(t.regiao_id, (territoriosPorRegiao.get(t.regiao_id) ?? 0) + 1);
    const rivalId = meuObjetivo.tipo === 'derrubar_rival' ? meuObjetivo.rivalId : null;
    progresso = avaliarObjetivo(meuObjetivo, {
      meusTerritorios: territorios.data
        .filter((t) => t.dono_id === jogadorId)
        .map((t) => {
          const aqui = tropas.data.find((x) => x.territorio_id === t.id);
          return { regiaoId: t.regiao_id, minhasTropas: aqui ? aqui.lanceiro + aqui.arqueiro + aqui.cavalaria : 0 };
        }),
      territoriosPorRegiao,
      totalTerritorios: territorios.data.length,
      populacao: placar.data.find((p) => p.jogador_id === jogadorId)?.populacao ?? 0,
      rival: rivalId
        ? {
            territorios: territorios.data.filter((t) => t.dono_id === rivalId).length,
            conquisteiDele: conquistas.data.some((c) => c.defensor_id === rivalId),
            outrosConquistaramDele: false,
          }
        : undefined,
    });
  }

  return {
    temporada,
    meuObjetivo,
    progresso,
    revelados:
      temporada.status === 'encerrada'
        ? objetivos.data.map((o) => ({ jogadorId: o.jogador_id, objetivo: o.objetivo, cumpridoEm: o.cumprido_em }))
        : [],
    placar: placar.data.map((p) => ({
      jogadorId: p.jogador_id,
      nome: nomeJogador(p.jogador_id),
      cor: nomesJogadores.get(p.jogador_id)?.cor ?? null,
      territorios: p.territorios,
      populacao: p.populacao,
      vitorias: p.vitorias,
      pontos: p.pontos,
    })),
    nomeRegiao: (id) => nomesRegioes.get(id) ?? 'uma região',
    nomeJogador,
    historico: temporadas
      .filter((t) => t.status === 'encerrada')
      .map((t) => ({
        numero: t.numero,
        vencedor: t.vencedor_id ? nomeJogador(t.vencedor_id) : null,
        motivoFim: t.motivo_fim,
        encerradaEm: t.encerrada_em ? Date.parse(t.encerrada_em) : null,
      })),
  };
}

/** Temporada ativa (ou a última encerrada), com objetivo, progresso, placar e histórico. */
export function useTemporada(jogadorId: string) {
  const [dados, setDados] = useState<DadosTemporada | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      let resultado = await buscar(jogadorId);
      // Quem já jogava antes do Épico 7 recebe o objetivo na primeira visita.
      if (resultado?.temporada.status === 'ativa' && !resultado.meuObjetivo) {
        await chamarFuncao('cidade', { acao: 'entrar' });
        resultado = await buscar(jogadorId);
      }
      setDados(resultado);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar a temporada.');
    }
  }, [jogadorId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return { dados, erro, recarregar: carregar };
}
