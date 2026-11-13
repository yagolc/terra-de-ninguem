import type { AreaReporte, Gravidade, StatusReporte, TipoReporte } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { abertoComoApp } from './instalacao';
import { supabase } from './supabase';

export const TIPOS_REPORTE_INFO: Record<TipoReporte, { nome: string; icone: string }> = {
  bug: { nome: 'Bug', icone: '🐞' },
  sugestao: { nome: 'Sugestão', icone: '💡' },
};

export const AREAS_INFO: Record<AreaReporte, string> = {
  cidade: '🏰 Cidade e prédios',
  mapa: '🗺️ Mapa',
  exercito: '⚔️ Exército e batalhas',
  diplomacia: '🕊️ Cartas e pactos',
  objetivos: '🎯 Objetivos e placar',
  loja: '💎 Loja e gemas',
  perfil: '🛡️ Perfil e bandeira',
  avisos: '🔔 Avisos e app',
  outro: '❔ Outro',
};

export const GRAVIDADES_INFO: Record<Gravidade, { nome: string; dica: string; classe: string }> = {
  baixa: { nome: 'Baixa', dica: 'Detalhe visual ou texto errado', classe: 'border-couro text-pergaminho-escuro' },
  media: { nome: 'Média', dica: 'Atrapalha, mas dá para contornar', classe: 'border-ouro/50 text-ouro-claro' },
  alta: { nome: 'Alta', dica: 'Algo do jogo não funciona', classe: 'border-[#d9822b] text-[#f0a35e]' },
  critica: { nome: 'Crítica', dica: 'Não dá para jogar ou perdeu progresso', classe: 'border-sangue bg-sangue/30 text-pergaminho' },
};

export const STATUS_INFO: Record<StatusReporte, { nome: string; classe: string }> = {
  novo: { nome: 'Novo', classe: 'border-[#3498db]/70 text-[#7fbfeb]' },
  em_analise: { nome: 'Em análise', classe: 'border-ouro/60 text-ouro-claro' },
  planejado: { nome: 'Planejado', classe: 'border-[#9b59b6]/70 text-[#c79be0]' },
  em_andamento: { nome: 'Em andamento', classe: 'border-[#f39c12]/70 text-[#f6b955]' },
  resolvido: { nome: 'Resolvido', classe: 'border-musgo text-[#9ccc7a]' },
  nao_sera_feito: { nome: 'Não será feito', classe: 'border-couro text-pergaminho-escuro' },
  duplicado: { nome: 'Duplicado', classe: 'border-couro text-pergaminho-escuro' },
};

export type ItemReporte = {
  id: string;
  numero: number;
  jogadorId: string;
  autor: string;
  tipo: TipoReporte;
  area: AreaReporte;
  gravidade: Gravidade | null;
  titulo: string;
  descricao: string;
  passos: string;
  esperado: string;
  aconteceu: string;
  contexto: Record<string, string>;
  status: StatusReporte;
  resposta: string | null;
  criadoEm: number;
  atualizadoEm: number;
  votos: number;
  meuVoto: boolean;
};

type Linha = {
  id: string;
  numero: number;
  jogador_id: string;
  tipo: TipoReporte;
  area: AreaReporte;
  gravidade: Gravidade | null;
  titulo: string;
  descricao: string;
  passos: string;
  esperado: string;
  aconteceu: string;
  contexto: Record<string, string> | null;
  status: StatusReporte;
  resposta: string | null;
  criado_em: string;
  atualizado_em: string;
};

/** Dados do aparelho que vão junto no relato (padrão dos rastreadores de bug): navegador, tela, versão e aba. */
export function contextoDoAparelho(aba: string): Record<string, string> {
  const ua = navigator.userAgent;
  const navegador = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Chrome\//.test(ua)
        ? 'Chrome'
        : /Firefox\//.test(ua)
          ? 'Firefox'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Outro';
  const sistema = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Outro';
  return {
    navegador,
    sistema,
    tela: `${window.innerWidth}×${window.innerHeight} (${window.devicePixelRatio}x)`,
    versao: __VERSAO__,
    aba,
    instalado: abertoComoApp() ? 'sim' : 'não',
  };
}

async function buscarReportes(meuId: string): Promise<{ itens: ItemReporte[]; organizador: boolean }> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const [reportes, votos, organizador] = await Promise.all([
    supabase
      .from('reportes')
      .select('id, numero, jogador_id, tipo, area, gravidade, titulo, descricao, passos, esperado, aconteceu, contexto, status, resposta, criado_em, atualizado_em')
      .order('numero', { ascending: false })
      .limit(300)
      .returns<Linha[]>(),
    supabase.from('votos_reportes').select('reporte_id, jogador_id').returns<{ reporte_id: string; jogador_id: string }[]>(),
    supabase.rpc('sou_organizador'),
  ]);
  if (reportes.error || votos.error) throw new Error('Não foi possível carregar o feedback.');
  const autores = [...new Set((reportes.data ?? []).map((r) => r.jogador_id))];
  const nomes = autores.length
    ? new Map(((await supabase.from('jogadores').select('id, nome').in('id', autores)).data ?? []).map((j: { id: string; nome: string }) => [j.id, j.nome]))
    : new Map<string, string>();
  const contagem = new Map<string, number>();
  const meus = new Set<string>();
  for (const v of votos.data ?? []) {
    contagem.set(v.reporte_id, (contagem.get(v.reporte_id) ?? 0) + 1);
    if (v.jogador_id === meuId) meus.add(v.reporte_id);
  }
  return {
    organizador: organizador.data === true,
    itens: (reportes.data ?? []).map((r) => ({
      id: r.id,
      numero: r.numero,
      jogadorId: r.jogador_id,
      autor: nomes.get(r.jogador_id) ?? 'alguém',
      tipo: r.tipo,
      area: r.area,
      gravidade: r.gravidade,
      titulo: r.titulo,
      descricao: r.descricao,
      passos: r.passos,
      esperado: r.esperado,
      aconteceu: r.aconteceu,
      contexto: r.contexto ?? {},
      status: r.status,
      resposta: r.resposta,
      criadoEm: Date.parse(r.criado_em),
      atualizadoEm: Date.parse(r.atualizado_em),
      votos: contagem.get(r.id) ?? 0,
      meuVoto: meus.has(r.id),
    })),
  };
}

/** Relatos de bug e sugestões (todos veem), votos e, para o organizador, mudar o status. */
export function useReportes(meuId: string) {
  const [itens, setItens] = useState<ItemReporte[] | null>(null);
  const [organizador, setOrganizador] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    try {
      const r = await buscarReportes(meuId);
      setItens(r.itens);
      setOrganizador(r.organizador);
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar o feedback.');
    }
  }, [meuId]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const enviar = useCallback(
    async (corpo: Record<string, unknown>) => {
      const r = await chamarFuncao<{ numero: number }>('cidade', { acao: 'enviar_reporte', ...corpo });
      await recarregar();
      return r.numero;
    },
    [recarregar],
  );

  const votar = useCallback(
    async (reporteId: string) => {
      // Muda na hora na tela; o servidor confirma e a lista é relida.
      setItens((lista) =>
        lista?.map((i) => (i.id === reporteId ? { ...i, meuVoto: !i.meuVoto, votos: i.votos + (i.meuVoto ? -1 : 1) } : i)) ?? lista,
      );
      try {
        await chamarFuncao('cidade', { acao: 'votar_reporte', reporte_id: reporteId });
      } finally {
        await recarregar();
      }
    },
    [recarregar],
  );

  const atualizar = useCallback(
    async (reporteId: string, status: StatusReporte, resposta: string) => {
      await chamarFuncao('cidade', { acao: 'atualizar_reporte', reporte_id: reporteId, status, resposta });
      await recarregar();
    },
    [recarregar],
  );

  return { itens, organizador, erro, enviar, votar, atualizar, recarregar };
}
