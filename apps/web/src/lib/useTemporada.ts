import {
  avaliarObjetivo,
  cidadesAlheiasPorRegiao,
  monopolioComercial,
  relogioDoObjetivo,
  type AvaliacaoObjetivo,
  type Bandeira,
  type Monopolio,
  type Objetivo,
  type Raca,
} from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { bandeiraDoJogador, COLUNAS_BANDEIRA, type LinhaBandeira } from './bandeira';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

export type LinhaPlacar = {
  jogadorId: string;
  nome: string;
  cor: string | null;
  bandeira: Bandeira;
  territorios: number;
  populacao: number;
  vitorias: number;
  pontos: number;
  raca: Raca | null;
  /** Herdeiro do trono caído (vencedor da temporada anterior): cabeça a prêmio. */
  herdeiro: boolean;
  /** Cumpriu o objetivo secreto e vence nesta hora se mantiver (relógio público), ou null. */
  objetivoVenceEm: number | null;
  /** Vezes que usou gemas na temporada (público; não diz em quê). */
  usosGemas: number;
};

export type TemporadaInfo = {
  id: string;
  numero: number;
  inicio: number;
  fimPrevisto: number | null;
  status: 'ativa' | 'encerrada';
  vencedorId: string | null;
  motivoFim: MotivoFim | null;
  encerradaEm: number | null;
};

export type MotivoFim = 'objetivo' | 'prazo' | 'monopolio';

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
  historico: { numero: number; vencedor: string | null; motivoFim: MotivoFim | null; encerradaEm: number | null }[];
  /** Monopólio comercial (aberto a todos): dono de cada cidade livre e quem tem todas, se alguém tiver. */
  monopolio: { donos: (string | null)[]; situacao: Monopolio | null };
};

type LinhaTemporada = {
  id: string;
  numero: number;
  inicio: string;
  fim_previsto: string | null;
  status: 'ativa' | 'encerrada';
  vencedor_id: string | null;
  motivo_fim: MotivoFim | null;
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

  const [jogadores, regioes, placar, objetivos, territorios, tropas, batalhas, cidade, povoados, racas, usosGemas] = await Promise.all([
    supabase.from('jogadores').select(`id, nome, ${COLUNAS_BANDEIRA}`).returns<(LinhaBandeira & { nome: string })[]>(),
    supabase.from('regioes').select('id, nome').eq('temporada_id', temporada.id).returns<{ id: string; nome: string }[]>(),
    supabase
      .from('placar')
      .select('jogador_id, territorios, populacao, vitorias, pontos, objetivo_desde')
      .eq('temporada_id', temporada.id)
      .order('pontos', { ascending: false })
      .returns<{ jogador_id: string; territorios: number; populacao: number; vitorias: number; pontos: number; objetivo_desde: string | null }[]>(),
    // O RLS devolve só o meu objetivo, ou todos depois que a temporada acaba.
    supabase
      .from('objetivos')
      .select('jogador_id, objetivo, cumprido_em')
      .eq('temporada_id', temporada.id)
      .returns<{ jogador_id: string; objetivo: Objetivo; cumprido_em: string | null }[]>(),
    supabase
      .from('territorios')
      .select('id, regiao_id, dono_id, cidade_principal')
      .eq('temporada_id', temporada.id)
      .returns<{ id: string; regiao_id: string; dono_id: string | null; cidade_principal: boolean }[]>(),
    supabase
      .from('tropas')
      .select('territorio_id, lanceiro, arqueiro, cavalaria')
      .eq('temporada_id', temporada.id)
      .eq('dono_id', jogadorId)
      .returns<{ territorio_id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>(),
    // O RLS devolve só as batalhas em que o jogador lutou.
    supabase
      .from('relatorios')
      .select('atacante_id, defensor_id, territorio_id, vencedor, conquistou')
      .eq('temporada_id', temporada.id)
      .returns<
        // vencedor nulo: tropas que voltaram sem lutar (não conta como vitória).
        { atacante_id: string; defensor_id: string | null; territorio_id: string; vencedor: 'atacante' | 'defensor' | null; conquistou: boolean }[]
      >(),
    supabase
      .from('cidades')
      .select('ouro, predios(tipo, nivel)')
      .eq('temporada_id', temporada.id)
      .eq('jogador_id', jogadorId)
      .maybeSingle<{ ouro: number; predios: { tipo: string; nivel: number }[] }>(),
    supabase
      .from('povoados')
      .select('territorio_id, tipo, nivel, posse_desde')
      .eq('temporada_id', temporada.id)
      .returns<{ territorio_id: string; tipo: 'vila' | 'cidade_livre'; nivel: number; posse_desde: string | null }[]>(),
    supabase.rpc('racas_na_temporada', { p_temporada: temporada.id }),
    supabase.rpc('usos_de_gemas_na_temporada', { p_temporada: temporada.id }),
  ]);
  // Sem a função (migration antiga) o placar só não mostra o ⚡.
  const usosDe = new Map(((usosGemas.data ?? []) as { jogador_id: string; usos: number }[]).map((u) => [u.jogador_id, u.usos]));
  if (!jogadores.data || !regioes.data || !placar.data || !objetivos.data || !territorios.data || !tropas.data || !batalhas.data || !povoados.data) {
    throw new Error('Não foi possível carregar o placar.');
  }

  const nomesJogadores = new Map(jogadores.data.map((j) => [j.id, j]));
  const nomesRegioes = new Map(regioes.data.map((r) => [r.id, r.nome]));
  const nomeJogador = (id: string) => nomesJogadores.get(id)?.nome ?? 'um jogador';
  const meuObjetivo = objetivos.data.find((o) => o.jogador_id === jogadorId)?.objetivo ?? null;
  const racaDe = new Map(((racas.data ?? []) as { jogador_id: string; raca: Raca | null }[]).map((r) => [r.jogador_id, r.raca]));
  const herdeiroId = temporadas.find((t) => t.status === 'encerrada' && t.numero < temporada.numero)?.vencedor_id ?? null;

  const donoDe = (territorioId: string) => territorios.data.find((t) => t.id === territorioId)?.dono_id ?? null;
  // Vilas e cidades livres (públicas); o dono é o do território.
  const cidadesLivres = { data: povoados.data.filter((p) => p.tipo === 'cidade_livre') };
  const livres = cidadesLivres.data.map((c) => ({
    donoId: donoDe(c.territorio_id),
    posseDesde: c.posse_desde ? Date.parse(c.posse_desde) : null,
  }));

  let progresso: AvaliacaoObjetivo | null = null;
  if (meuObjetivo) {
    const territoriosPorRegiao = new Map<string, number>();
    for (const t of territorios.data) territoriosPorRegiao.set(t.regiao_id, (territoriosPorRegiao.get(t.regiao_id) ?? 0) + 1);
    const rivalId = meuObjetivo.tipo === 'derrubar_rival' ? meuObjetivo.rivalId : null;
    // "Velha rixa": jogadores da raça e os territórios diferentes que eu já conquistei deles.
    const daRaca = meuObjetivo.tipo === 'velha_rixa' ? [...racaDe].filter(([, r]) => r === meuObjetivo.raca).map(([id]) => id) : [];
    progresso = avaliarObjetivo(meuObjetivo, {
      meusTerritorios: territorios.data
        .filter((t) => t.dono_id === jogadorId)
        .map((t) => {
          const aqui = tropas.data.find((x) => x.territorio_id === t.id);
          return { id: t.id, regiaoId: t.regiao_id, minhasTropas: aqui ? aqui.lanceiro + aqui.arqueiro + aqui.cavalaria : 0 };
        }),
      vitoriasContraJogadores: batalhas.data.filter((b) =>
        b.vencedor === 'atacante' ? b.atacante_id === jogadorId && b.defensor_id !== null : b.defensor_id === jogadorId,
      ).length,
      niveisPredios: cidade.data?.predios.map((p) => p.nivel) ?? [],
      nivelMuralha: cidade.data?.predios.find((p) => p.tipo === 'muralha')?.nivel ?? 0,
      niveisVilas: povoados.data
        .filter((p) => p.tipo === 'vila' && donoDe(p.territorio_id) === jogadorId)
        .map((p) => p.nivel),
      ouro: cidade.data?.ouro ?? 0,
      cidadesLivres: cidadesLivres.data.map((c) => ({
        minha: territorios.data.find((t) => t.id === c.territorio_id)?.dono_id === jogadorId,
        posseDesde: c.posse_desde ? Date.parse(c.posse_desde) : null,
      })),
      agora: Date.now(),
      territoriosPorRegiao,
      cidadesAlheiasPorRegiao: cidadesAlheiasPorRegiao(
        territorios.data.map((t) => ({ regiaoId: t.regiao_id, donoId: t.dono_id, cidadePrincipal: t.cidade_principal })),
        jogadorId,
      ),
      totalTerritorios: territorios.data.length,
      populacao: placar.data.find((p) => p.jogador_id === jogadorId)?.populacao ?? 0,
      rixa:
        meuObjetivo.tipo === 'velha_rixa'
          ? {
              territoriosConquistados: new Set(
                batalhas.data
                  .filter((b) => b.atacante_id === jogadorId && b.conquistou && b.defensor_id && daRaca.includes(b.defensor_id))
                  .map((b) => b.territorio_id),
              ).size,
              jogadoresDaRaca: daRaca.length,
              todosSoNaCidade: daRaca.every((id) => territorios.data.filter((t) => t.dono_id === id).length <= 1),
            }
          : undefined,
      rival: rivalId
        ? {
            territorios: territorios.data.filter((t) => t.dono_id === rivalId).length,
            conquisteiDele: batalhas.data.some((b) => b.atacante_id === jogadorId && b.conquistou && b.defensor_id === rivalId),
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
      bandeira: bandeiraDoJogador(
        nomesJogadores.get(p.jogador_id) ?? { id: p.jogador_id, cor: null, cor_secundaria: null, padrao: null, emblema: null },
      ),
      territorios: p.territorios,
      populacao: p.populacao,
      vitorias: p.vitorias,
      pontos: p.pontos,
      raca: racaDe.get(p.jogador_id) ?? null,
      herdeiro: p.jogador_id === herdeiroId,
      objetivoVenceEm: p.objetivo_desde
        ? relogioDoObjetivo({ cumprido: true, segurandoDesde: Date.parse(p.objetivo_desde), agora: Date.now(), inicioTemporada: temporada.inicio })
            .venceEm
        : null,
      usosGemas: usosDe.get(p.jogador_id) ?? 0,
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
    monopolio: { donos: livres.map((c) => c.donoId), situacao: monopolioComercial(livres, Date.now()) },
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
