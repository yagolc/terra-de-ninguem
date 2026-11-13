import { desbloqueiosDe, type Desbloqueios, type ItemComprado, type TituloLoja } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

export type PedidoGemas = {
  codigo: string;
  gemas: number;
  valorCentavos: number;
  status: 'pendente' | 'pago' | 'cancelado';
  criadoEm: number;
  pagoEm: number | null;
};

export type Gemas = {
  saldo: number;
  /** Vezes que o jogador usou gemas na temporada ativa (o preço dobra a cada uso). */
  usos: number;
  pedidos: PedidoGemas[];
  /** Itens da loja já comprados e o que eles liberam no perfil. */
  itens: ItemComprado[];
  desbloqueios: Desbloqueios;
  /** Temporada ativa (itens de temporada valem só nela), ou null. */
  temporadaId: string | null;
  /** Título que o jogador mostra no placar e no perfil. */
  titulo: TituloLoja | null;
  /** Arautos do jogador nesta temporada (o preço dobra) e até quando o último fica no ar. */
  arautos: { usos: number; noArAte: number | null };
  /** Últimos presentes de gemas, mandados ou recebidos. */
  presentes: { id: string; enviado: boolean; outroId: string; outroNome: string; gemas: number; criadoEm: number }[];
};

type LinhaPedido = {
  codigo: string;
  gemas: number;
  valor_centavos: number;
  status: PedidoGemas['status'];
  criado_em: string;
  pago_em: string | null;
};

async function buscarGemas(): Promise<Gemas> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  // O RLS devolve só o saldo, os pedidos e os usos do próprio jogador.
  const { data: sessao } = await supabase.auth.getSession();
  const meuId = sessao.session?.user.id ?? '';
  const [saldo, usos, pedidos, itens, ativa, eu, arautos, presentes] = await Promise.all([
    supabase.from('gemas').select('saldo').maybeSingle<{ saldo: number }>(),
    supabase
      .from('usos_gemas')
      .select('id, temporadas!inner(status)', { count: 'exact', head: true })
      .eq('temporadas.status', 'ativa'),
    supabase
      .from('pedidos_gemas')
      .select('codigo, gemas, valor_centavos, status, criado_em, pago_em')
      .neq('status', 'cancelado')
      .order('criado_em', { ascending: false })
      .limit(10)
      .returns<LinhaPedido[]>(),
    supabase.from('itens_comprados').select('item, variante, temporada_id').returns<{ item: string; variante: string | null; temporada_id: string | null }[]>(),
    supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>(),
    supabase.from('jogadores').select('titulo').eq('id', meuId).maybeSingle<{ titulo: TituloLoja | null }>(),
    supabase
      .from('arautos')
      .select('ate, temporadas!inner(status)')
      .eq('jogador_id', meuId)
      .eq('temporadas.status', 'ativa')
      .returns<{ ate: string }[]>(),
    // O RLS devolve só os presentes que o jogador mandou ou recebeu.
    supabase
      .from('presentes_gemas')
      .select('id, remetente_id, destinatario_id, gemas, criado_em')
      .order('criado_em', { ascending: false })
      .limit(10)
      .returns<{ id: string; remetente_id: string; destinatario_id: string; gemas: number; criado_em: string }[]>(),
  ]);
  if (saldo.error || usos.error || pedidos.error || itens.error) throw new Error('Não foi possível carregar suas gemas.');
  // Nomes de quem deu ou recebeu os presentes.
  const outros = [...new Set((presentes.data ?? []).map((p) => (p.remetente_id === meuId ? p.destinatario_id : p.remetente_id)))];
  const nomes = outros.length
    ? new Map(((await supabase.from('jogadores').select('id, nome').in('id', outros)).data ?? []).map((j: { id: string; nome: string }) => [j.id, j.nome]))
    : new Map<string, string>();
  const comprados = (itens.data ?? []).map((i) => ({ item: i.item, variante: i.variante, temporadaId: i.temporada_id }));
  return {
    saldo: saldo.data?.saldo ?? 0,
    usos: usos.count ?? 0,
    pedidos: (pedidos.data ?? []).map((p) => ({
      codigo: p.codigo,
      gemas: p.gemas,
      valorCentavos: p.valor_centavos,
      status: p.status,
      criadoEm: Date.parse(p.criado_em),
      pagoEm: p.pago_em ? Date.parse(p.pago_em) : null,
    })),
    itens: comprados,
    desbloqueios: desbloqueiosDe(comprados),
    temporadaId: ativa.data?.id ?? null,
    titulo: eu.data?.titulo ?? null,
    arautos: {
      usos: arautos.data?.length ?? 0,
      noArAte: arautos.data && arautos.data.length > 0 ? Math.max(...arautos.data.map((a) => Date.parse(a.ate))) : null,
    },
    presentes: (presentes.data ?? []).map((p) => ({
      id: p.id,
      enviado: p.remetente_id === meuId,
      outroId: p.remetente_id === meuId ? p.destinatario_id : p.remetente_id,
      outroNome: nomes.get(p.remetente_id === meuId ? p.destinatario_id : p.remetente_id) ?? 'alguém',
      gemas: p.gemas,
      criadoEm: Date.parse(p.criado_em),
    })),
  };
}

/** Saldo de gemas, usos na temporada e pedidos de compra do jogador. */
export function useGemas() {
  const [gemas, setGemas] = useState<Gemas | null>(null);

  const recarregar = useCallback(async () => {
    try {
      setGemas(await buscarGemas());
    } catch {
      // Sem gemas carregadas o botão ⚡ e a loja só não aparecem; o resto do jogo segue.
    }
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const pedir = useCallback(
    async (quantidade: number) => {
      const r = await chamarFuncao<{ codigo: string; valor_centavos: number }>('cidade', { acao: 'pedir_gemas', gemas: quantidade });
      await recarregar();
      return r;
    },
    [recarregar],
  );

  const cancelarPedido = useCallback(
    async (codigo: string) => {
      await chamarFuncao('cidade', { acao: 'cancelar_pedido_gemas', codigo });
      await recarregar();
    },
    [recarregar],
  );

  const comprar = useCallback(
    async (item: string, variante?: string) => {
      await chamarFuncao('cidade', { acao: 'comprar_item', item, ...(variante ? { variante } : {}) });
      await recarregar();
    },
    [recarregar],
  );

  const usarTitulo = useCallback(
    async (titulo: TituloLoja | null) => {
      await chamarFuncao('cidade', { acao: 'usar_titulo', titulo });
      await recarregar();
    },
    [recarregar],
  );

  const publicarArauto = useCallback(
    async (texto: string) => {
      await chamarFuncao('cidade', { acao: 'publicar_arauto', texto });
      await recarregar();
    },
    [recarregar],
  );

  const presentear = useCallback(
    async (destinatarioId: string, quantidade: number) => {
      await chamarFuncao('cidade', { acao: 'presentear_gemas', destinatario_id: destinatarioId, gemas: quantidade });
      await recarregar();
    },
    [recarregar],
  );

  return { gemas, recarregar, pedir, cancelarPedido, comprar, usarTitulo, publicarArauto, presentear };
}
