import type { TipoProposta } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

/** Carta mandada ou recebida pelo jogador (o RLS só mostra as recebidas depois de chegarem). */
export type Carta = {
  id: string;
  remetenteId: string;
  destinatarioId: string;
  texto: string;
  proposta: TipoProposta | null;
  horasPacto: number | null;
  enviadaEm: number;
  chegaEm: number;
  lida: boolean;
  resposta: 'aceita' | 'recusada' | null;
  respondidaEm: number | null;
  respostaVista: boolean;
  pactoAte: number | null;
};

/** Jogador desta temporada que pode receber carta, com a posição da cidade (para o tempo de voo). */
export type Correspondente = { id: string; nome: string; cor: string | null; cidade: { x: number; y: number } | null };

export type EstadoCartas = {
  cartas: Carta[];
  /** Jogadores com cidade na temporada ativa, menos o próprio. */
  correspondentes: Correspondente[];
  nomes: Map<string, string>;
  minhaCidade: { x: number; y: number } | null;
  nivelPombal: number;
};

type LinhaCarta = {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  texto: string;
  proposta: TipoProposta | null;
  horas_pacto: number | null;
  enviada_em: string;
  chega_em: string;
  lida: boolean;
  resposta: 'aceita' | 'recusada' | null;
  respondida_em: string | null;
  resposta_vista: boolean;
  pacto_ate: string | null;
};

const data = (v: string | null) => (v ? Date.parse(v) : null);

async function buscar(meuId: string): Promise<EstadoCartas | null> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
  if (!temporada) return null;

  const [cartas, jogadores, racas, cidadesNoMapa, minhaCidade] = await Promise.all([
    supabase
      .from('cartas')
      .select('id, remetente_id, destinatario_id, texto, proposta, horas_pacto, enviada_em, chega_em, lida, resposta, respondida_em, resposta_vista, pacto_ate')
      .eq('temporada_id', temporada.id)
      .order('enviada_em', { ascending: false })
      .limit(200)
      .returns<LinhaCarta[]>(),
    supabase.from('jogadores').select('id, nome, cor').returns<{ id: string; nome: string; cor: string | null }[]>(),
    supabase.rpc('racas_na_temporada', { p_temporada: temporada.id }),
    supabase
      .from('territorios')
      .select('dono_id, x, y')
      .eq('temporada_id', temporada.id)
      .eq('cidade_principal', true)
      .returns<{ dono_id: string | null; x: number; y: number }[]>(),
    supabase.from('cidades').select('id').eq('temporada_id', temporada.id).eq('jogador_id', meuId).maybeSingle<{ id: string }>(),
  ]);
  if (!cartas.data || !jogadores.data) throw new Error('Não foi possível carregar as cartas.');

  // Nível do Pombal, contando as obras dele que já terminaram e o servidor ainda não gravou.
  let nivelPombal = 0;
  if (minhaCidade.data) {
    const [predio, obras] = await Promise.all([
      supabase.from('predios').select('nivel').eq('cidade_id', minhaCidade.data.id).eq('tipo', 'pombal').maybeSingle<{ nivel: number }>(),
      supabase
        .from('obras')
        .select('pronto_em')
        .eq('cidade_id', minhaCidade.data.id)
        .eq('tipo', 'pombal')
        .lte('pronto_em', new Date().toISOString())
        .returns<{ pronto_em: string }[]>(),
    ]);
    nivelPombal = (predio.data?.nivel ?? 0) + (obras.data?.length ?? 0);
  }

  const cidades = new Map((cidadesNoMapa.data ?? []).flatMap((t) => (t.dono_id ? [[t.dono_id, { x: t.x, y: t.y }] as const] : [])));
  const naTemporada = new Set(((racas.data ?? []) as { jogador_id: string }[]).map((r) => r.jogador_id));
  const nomes = new Map(jogadores.data.map((j) => [j.id, j.nome]));
  return {
    cartas: cartas.data.map((c) => ({
      id: c.id,
      remetenteId: c.remetente_id,
      destinatarioId: c.destinatario_id,
      texto: c.texto,
      proposta: c.proposta,
      horasPacto: c.horas_pacto,
      enviadaEm: Date.parse(c.enviada_em),
      chegaEm: Date.parse(c.chega_em),
      lida: c.lida,
      resposta: c.resposta,
      respondidaEm: data(c.respondida_em),
      respostaVista: c.resposta_vista,
      pactoAte: data(c.pacto_ate),
    })),
    correspondentes: jogadores.data
      .filter((j) => j.id !== meuId && naTemporada.has(j.id))
      .map((j) => ({ id: j.id, nome: j.nome, cor: j.cor, cidade: cidades.get(j.id) ?? null }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    nomes,
    minhaCidade: cidades.get(meuId) ?? null,
    nivelPombal,
  };
}

/** Cartas da temporada ativa (mandadas e recebidas). Marca as novas como lidas ao abrir; relê a cada minuto. */
export function useCartas(meuId: string) {
  const [estado, setEstado] = useState<EstadoCartas | null | undefined>(undefined);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    try {
      const dados = await buscar(meuId);
      setEstado(dados);
      const novas = dados?.cartas.some(
        (c) => (c.destinatarioId === meuId && !c.lida) || (c.remetenteId === meuId && c.resposta !== null && !c.respostaVista),
      );
      if (novas) void chamarFuncao('cidade', { acao: 'marcar_cartas_lidas' }).catch(() => {});
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar as cartas.');
    }
  }, [meuId]);

  useEffect(() => {
    void carregar();
    const t = setInterval(() => void carregar(), 60_000);
    return () => clearInterval(t);
  }, [carregar]);

  return { estado, erro, recarregar: carregar };
}

/** Cartas que chegaram sem ser lidas e respostas a propostas ainda não vistas (aviso na aba). */
export async function contarCartasNaoLidas(jogadorId: string): Promise<number> {
  if (!supabase) return 0;
  const { data: temporada } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
  if (!temporada) return 0;
  const cartas = () => supabase!.from('cartas').select('id', { count: 'exact', head: true }).eq('temporada_id', temporada.id);
  const [recebidas, respostas] = await Promise.all([
    // O RLS só conta as que já chegaram.
    cartas().eq('destinatario_id', jogadorId).eq('lida', false),
    cartas().eq('remetente_id', jogadorId).not('resposta', 'is', null).eq('resposta_vista', false),
  ]);
  return (recebidas.count ?? 0) + (respostas.count ?? 0);
}
