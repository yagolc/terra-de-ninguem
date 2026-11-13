import type { TipoPet } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

export const PETS_INFO: Record<TipoPet, { nome: string; icone: string }> = {
  lobo: { nome: 'Lobo', icone: '🐺' },
  corvo: { nome: 'Corvo', icone: '🐦‍⬛' },
  gato: { nome: 'Gato', icone: '🐈' },
  urso: { nome: 'Urso', icone: '🐻' },
  falcao: { nome: 'Falcão', icone: '🦅' },
  dragao: { nome: 'Dragãozinho', icone: '🐉' },
};

/** Pet de um jogador na temporada: onde está (`mantidoPor`) e o resgate pedido, se for refém. */
export type PetDaTemporada = {
  donoId: string;
  tipo: TipoPet;
  mantidoPor: string;
  resgateOuro: number | null;
  sequestradoEm: number | null;
};

type LinhaPet = { dono_id: string; tipo: TipoPet; mantido_por: string; resgate_ouro: number | null; sequestrado_em: string | null };

/** Todos os pets da temporada (públicos: o mapa mostra quem tem pet e os reféns). */
export async function buscarPets(temporadaId: string): Promise<PetDaTemporada[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('pets')
    .select('dono_id, tipo, mantido_por, resgate_ouro, sequestrado_em')
    .eq('temporada_id', temporadaId)
    .returns<LinhaPet[]>();
  return (data ?? []).map((p) => ({
    donoId: p.dono_id,
    tipo: p.tipo,
    mantidoPor: p.mantido_por,
    resgateOuro: p.resgate_ouro,
    sequestradoEm: p.sequestrado_em ? Date.parse(p.sequestrado_em) : null,
  }));
}

/** Pets da temporada ativa e os comandos do pet (escolher, resgate em ouro, libertar). */
export function usePets() {
  const [pets, setPets] = useState<PetDaTemporada[] | null>(null);
  const [nomes, setNomes] = useState<Map<string, string>>(new Map());

  const recarregar = useCallback(async () => {
    if (!supabase) return;
    const { data: ativa } = await supabase.from('temporadas').select('id').eq('status', 'ativa').maybeSingle<{ id: string }>();
    if (!ativa) return setPets([]);
    const lista = await buscarPets(ativa.id);
    const ids = [...new Set(lista.flatMap((p) => [p.donoId, p.mantidoPor]))];
    const { data: jogadores } = ids.length
      ? await supabase.from('jogadores').select('id, nome').in('id', ids).returns<{ id: string; nome: string }[]>()
      : { data: [] };
    setNomes(new Map((jogadores ?? []).map((j) => [j.id, j.nome])));
    setPets(lista);
  }, []);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const comando = useCallback(
    async (corpo: Record<string, unknown>) => {
      await chamarFuncao('cidade', corpo);
      await recarregar();
    },
    [recarregar],
  );

  return {
    pets,
    nomeDe: (id: string) => nomes.get(id) ?? 'alguém',
    escolher: (tipo: TipoPet | null) => comando({ acao: 'escolher_pet', tipo }),
    pedirResgate: (donoId: string, ouro: number) => comando({ acao: 'pedir_resgate', dono_id: donoId, ouro }),
    libertar: (donoId: string) => comando({ acao: 'libertar_pet', dono_id: donoId }),
    pagarResgate: () => comando({ acao: 'pagar_resgate' }),
    recarregar,
  };
}
