import { exercito, type Exercito, type Recursos } from '@terra/regras';
import { supabase } from './supabase';

/** Horda bárbara (pública): a caminho ou já resolvida, com o resultado. */
export type Horda = {
  id: string;
  numero: number;
  territorioId: string;
  /** Dono do alvo quando ela saiu. */
  alvoId: string | null;
  tropas: Exercito;
  origem: { x: number; y: number };
  partidaEm: number;
  chegadaEm: number;
  aCaminho: boolean;
  /** Quem estava no território quando ela chegou. */
  defensorId: string | null;
  vencedor: 'horda' | 'defensor' | null;
  conquistou: boolean;
  resultado: {
    dispersou?: boolean;
    cidadePrincipal?: boolean;
    ouro?: number;
    saque?: Recursos;
    perdasHorda?: Exercito;
  } | null;
};

type LinhaHorda = {
  id: string;
  numero: number;
  territorio_id: string;
  alvo_id: string | null;
  lanceiro: number;
  arqueiro: number;
  cavalaria: number;
  origem_x: number;
  origem_y: number;
  partida_em: string;
  chegada_em: string;
  status: 'a_caminho' | 'resolvida';
  defensor_id: string | null;
  vencedor: 'horda' | 'defensor' | null;
  conquistou: boolean;
  resultado: Horda['resultado'];
};

/** As últimas hordas da temporada, da mais nova para a mais antiga (públicas: todos veem). */
export async function buscarHordas(temporadaId: string, limite = 10): Promise<Horda[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('hordas')
    .select(
      'id, numero, territorio_id, alvo_id, lanceiro, arqueiro, cavalaria, origem_x, origem_y, partida_em, chegada_em, status, defensor_id, vencedor, conquistou, resultado',
    )
    .eq('temporada_id', temporadaId)
    .order('numero', { ascending: false })
    .limit(limite)
    .returns<LinhaHorda[]>();
  return (data ?? []).map((h) => ({
    id: h.id,
    numero: h.numero,
    territorioId: h.territorio_id,
    alvoId: h.alvo_id,
    tropas: exercito({ lanceiro: h.lanceiro, arqueiro: h.arqueiro, cavalaria: h.cavalaria }),
    origem: { x: h.origem_x, y: h.origem_y },
    partidaEm: Date.parse(h.partida_em),
    chegadaEm: Date.parse(h.chegada_em),
    aCaminho: h.status === 'a_caminho',
    defensorId: h.defensor_id,
    vencedor: h.vencedor,
    conquistou: h.conquistou,
    resultado: h.resultado,
  }));
}

/**
 * Uma frase sobre como a horda terminou, para o aviso do mapa e os relatórios. `nome` é o do defensor
 * ("Você" quando é o próprio jogador) e `lugar` o nome do território.
 */
export function resultadoDaHorda(h: Horda, nome: string, lugar: string): string {
  if (h.resultado?.dispersou || !h.vencedor) return `A horda chegou a ${lugar}, achou o território sem dono e se dispersou.`;
  if (h.vencedor === 'defensor') return `${nome} derrotou a horda em ${lugar} e ganhou ${h.resultado?.ouro ?? 0} de ouro.`;
  if (h.conquistou) return `A horda tomou ${lugar} de ${nome}: o território virou neutro.`;
  if (h.resultado?.cidadePrincipal) return `A horda venceu em ${lugar}, saqueou a cidade de ${nome} e foi embora.`;
  return `A horda venceu ${nome} em ${lugar}, mas sem folga para tomar o território, e foi embora.`;
}
