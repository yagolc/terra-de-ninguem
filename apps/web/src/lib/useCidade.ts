import {
  TIPOS_PREDIO,
  avancarCidade,
  exercito,
  type EstadoCidade,
  type NiveisPredios,
  type Obra,
  type TipoPredio,
} from '@terra/regras';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

type LinhaCidade = {
  comida: number;
  madeira: number;
  ouro: number;
  populacao: number;
  trabalhadores_comida: number;
  trabalhadores_madeira: number;
  trabalhadores_ouro: number;
  atualizado_em: string;
  predios: { tipo: TipoPredio; nivel: number; pronto_em: string | null }[];
};

type CidadeSalva = { cidade: EstadoCidade; obra: Obra | null };

function converter(linha: LinhaCidade): CidadeSalva {
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as NiveisPredios;
  let obra: Obra | null = null;
  for (const p of linha.predios) {
    predios[p.tipo] = p.nivel;
    if (p.pronto_em) obra = { tipo: p.tipo, prontoEm: Date.parse(p.pronto_em) };
  }
  return {
    obra,
    cidade: {
      recursos: { comida: linha.comida, madeira: linha.madeira, ouro: linha.ouro },
      populacao: linha.populacao,
      trabalhadores: {
        comida: linha.trabalhadores_comida,
        madeira: linha.trabalhadores_madeira,
        ouro: linha.trabalhadores_ouro,
      },
      predios,
      atualizadoEm: Date.parse(linha.atualizado_em),
    },
  };
}

async function buscarCidade(jogadorId: string): Promise<CidadeSalva | null> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const { data, error } = await supabase
    .from('cidades')
    .select(
      'comida, madeira, ouro, populacao, trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em, predios(tipo, nivel, pronto_em), temporadas!inner(status)',
    )
    .eq('jogador_id', jogadorId)
    .eq('temporadas.status', 'ativa')
    .maybeSingle<LinhaCidade>();
  if (error) throw new Error('Não foi possível carregar sua cidade.');
  return data ? converter(data) : null;
}

/**
 * Cidade do jogador na temporada ativa. O estado é recalculado no navegador a cada segundo com as
 * mesmas regras do servidor; comandos vão para a Edge Function `cidade` e depois a cidade é relida.
 */
export function useCidade(jogadorId: string) {
  const [salva, setSalva] = useState<CidadeSalva | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    try {
      let dados = await buscarCidade(jogadorId);
      if (!dados) {
        // Primeira visita na temporada: o servidor funda a cidade.
        await chamarFuncao('cidade', { acao: 'entrar' });
        dados = await buscarCidade(jogadorId);
      }
      setSalva(dados);
      setErro(dados ? null : 'Não foi possível criar sua cidade.');
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar a cidade.');
    }
  }, [jogadorId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  const atual = useMemo(
    // Tropas entram no Épico 5.
    () => (salva ? avancarCidade({ cidade: salva.cidade, tropas: exercito(), obra: salva.obra, agora }) : null),
    [salva, agora],
  );

  const comandar = useCallback(
    async (corpo: Record<string, unknown>) => {
      await chamarFuncao('cidade', corpo);
      await carregar();
    },
    [carregar],
  );

  return { cidade: atual?.cidade ?? null, obra: atual?.obra ?? null, agora, erro, comandar };
}
