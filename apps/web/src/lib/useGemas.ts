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
  const [saldo, usos, pedidos] = await Promise.all([
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
  ]);
  if (saldo.error || usos.error || pedidos.error) throw new Error('Não foi possível carregar suas gemas.');
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

  return { gemas, recarregar, pedir, cancelarPedido };
}
