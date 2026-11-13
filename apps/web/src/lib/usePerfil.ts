import type { Bandeira, Raca } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { bandeiraDoJogador, COLUNAS_BANDEIRA, nomeDoTitulo, type LinhaBandeira } from './bandeira';
import { supabase } from './supabase';

export type TemporadaDoPerfil = {
  numero: number;
  status: 'ativa' | 'encerrada';
  raca: Raca | null;
  venceu: boolean;
  motivoFim: string | null;
  /** Colocação no placar (null se a temporada não teve placar para ele). */
  posicao: number | null;
  participantes: number | null;
  pontos: number | null;
  territorios: number | null;
  populacao: number | null;
  vitorias: number | null;
};

export type Rival = { jogadorId: string; nome: string; bandeira: Bandeira; vitorias: number; derrotas: number };

export type DadosPerfil = {
  jogadorId: string;
  nome: string;
  descricao: string;
  /** Título comprado na loja que o jogador mostra (nome pronto), ou null. */
  titulo: string | null;
  bandeira: Bandeira;
  temporadas: TemporadaDoPerfil[];
  rivalidades: Rival[];
  /** Cores principais de outros jogadores com cidade na temporada em andamento (não dá para escolher). */
  coresEmUso: string[];
};

type LinhaJogador = LinhaBandeira & { nome: string; descricao: string | null; titulo: string | null };

type Resposta = {
  temporadas: {
    numero: number;
    status: 'ativa' | 'encerrada';
    raca: Raca | null;
    venceu: boolean;
    motivo_fim: string | null;
    posicao: number | null;
    participantes: number | null;
    pontos: number | null;
    territorios: number | null;
    populacao: number | null;
    vitorias: number | null;
  }[];
  rivalidades: { jogador_id: string; vitorias: number; derrotas: number }[];
};

async function buscarPerfil(jogadorId: string): Promise<DadosPerfil | null> {
  if (!supabase) return null;
  const [jogadores, estatisticas, ativa] = await Promise.all([
    supabase.from('jogadores').select(`id, nome, descricao, titulo, ${COLUNAS_BANDEIRA}`).returns<LinhaJogador[]>(),
    supabase.rpc('perfil_jogador', { p_jogador: jogadorId }),
    supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>(),
  ]);
  if (jogadores.error || estatisticas.error || !jogadores.data || !estatisticas.data) {
    throw new Error('Não foi possível carregar o perfil.');
  }
  const porId = new Map(jogadores.data.map((j) => [j.id, j]));
  const jogador = porId.get(jogadorId);
  if (!jogador) return null;

  // Quem tem cidade na temporada em andamento (a função devolve só jogador e raça).
  let naTemporada: string[] = [];
  if (ativa.data) {
    const { data } = await supabase.rpc('racas_na_temporada', { p_temporada: ativa.data.id });
    naTemporada = ((data ?? []) as { jogador_id: string }[]).map((r) => r.jogador_id);
  }

  const dados = estatisticas.data as Resposta;
  return {
    jogadorId,
    nome: jogador.nome,
    descricao: jogador.descricao ?? '',
    titulo: nomeDoTitulo(jogador.titulo),
    bandeira: bandeiraDoJogador(jogador),
    temporadas: dados.temporadas.map((t) => ({
      numero: t.numero,
      status: t.status,
      raca: t.raca,
      venceu: t.venceu,
      motivoFim: t.motivo_fim,
      posicao: t.posicao,
      participantes: t.participantes,
      pontos: t.pontos,
      territorios: t.territorios,
      populacao: t.populacao,
      vitorias: t.vitorias,
    })),
    rivalidades: dados.rivalidades.flatMap((r) => {
      const rival = porId.get(r.jogador_id);
      return rival
        ? [{ jogadorId: rival.id, nome: rival.nome, bandeira: bandeiraDoJogador(rival), vitorias: r.vitorias, derrotas: r.derrotas }]
        : [];
    }),
    coresEmUso: naTemporada
      .filter((id) => id !== jogadorId)
      .flatMap((id) => {
        const cor = porId.get(id)?.cor;
        return cor ? [cor.toLowerCase()] : [];
      }),
  };
}

/** Perfil de um jogador (o próprio ou de outro): bandeira, descrição e estatísticas públicas. */
export function usePerfil(jogadorId: string) {
  const [dados, setDados] = useState<DadosPerfil | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setDados(await buscarPerfil(jogadorId));
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível carregar o perfil.');
    }
  }, [jogadorId]);

  useEffect(() => {
    setDados(undefined);
    void recarregar();
  }, [recarregar]);

  return { dados, erro, recarregar };
}
