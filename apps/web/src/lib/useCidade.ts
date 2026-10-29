import {
  TIPOS_PREDIO,
  avancarCidade,
  bonusDeTerritorios,
  exercito,
  soldadosNaConta,
  somarExercitos,
  totalUnidades,
  type EstadoCidade,
  type Exercito,
  type LoteTreino,
  type NiveisPredios,
  type Obra,
  type Recurso,
  type Recursos,
  type Terreno,
  type TipoPredio,
  type TipoUnidade,
} from '@terra/regras';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

type LinhaCidade = {
  temporada_id: string;
  territorio_id: string | null;
  comida: number;
  madeira: number;
  ouro: number;
  populacao: number;
  trabalhadores_comida: number;
  trabalhadores_madeira: number;
  trabalhadores_ouro: number;
  atualizado_em: string;
  predios: { tipo: TipoPredio; nivel: number }[];
  obras: { tipo: TipoPredio; pronto_em: string }[];
  filas_treino: { tipo_unidade: TipoUnidade; quantidade: number; pronto_em: string }[];
};

type TerritorioDoJogador = { id: string; nome: string; terreno: Terreno; bonus_recurso: Recurso };
type LinhaTropas = { lanceiro: number; arqueiro: number; cavalaria: number };

type CidadeSalva = {
  cidade: EstadoCidade;
  obras: Obra[];
  bonus: Recursos;
  /** Todas as tropas do jogador (todas comem). */
  tropas: Exercito;
  fila: LoteTreino[];
  /** Território onde fica a cidade (null na temporada de testes, sem mapa). */
  territorio: TerritorioDoJogador | null;
  territorios: number;
};

function converter(linha: LinhaCidade, territorios: TerritorioDoJogador[], tropas: LinhaTropas[]): CidadeSalva {
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as NiveisPredios;
  for (const p of linha.predios) predios[p.tipo] = p.nivel;
  return {
    obras: linha.obras
      .map((o) => ({ tipo: o.tipo, prontoEm: Date.parse(o.pronto_em) }))
      .sort((a, b) => a.prontoEm - b.prontoEm),
    bonus: bonusDeTerritorios(territorios.map((t) => t.bonus_recurso)),
    tropas: somarExercitos(exercito(), ...tropas.map((t) => exercito(t))),
    fila: linha.filas_treino
      .map((l) => ({ tipo: l.tipo_unidade, quantidade: l.quantidade, prontoEm: Date.parse(l.pronto_em) }))
      .sort((a, b) => a.prontoEm - b.prontoEm),
    territorio: territorios.find((t) => t.id === linha.territorio_id) ?? null,
    territorios: territorios.length,
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
      'temporada_id, territorio_id, comida, madeira, ouro, populacao, trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em, predios(tipo, nivel), obras(tipo, pronto_em), filas_treino(tipo_unidade, quantidade, pronto_em), temporadas!inner(status)',
    )
    .eq('jogador_id', jogadorId)
    .eq('temporadas.status', 'ativa')
    .maybeSingle<LinhaCidade>();
  if (error) throw new Error('Não foi possível carregar sua cidade.');
  if (!data) return null;

  const [territorios, tropas] = await Promise.all([
    supabase
      .from('territorios')
      .select('id, nome, terreno, bonus_recurso')
      .eq('temporada_id', data.temporada_id)
      .eq('dono_id', jogadorId)
      .returns<TerritorioDoJogador[]>(),
    supabase
      .from('tropas')
      .select('lanceiro, arqueiro, cavalaria')
      .eq('temporada_id', data.temporada_id)
      .eq('dono_id', jogadorId)
      .returns<LinhaTropas[]>(),
  ]);
  if (!territorios.data || !tropas.data) throw new Error('Não foi possível carregar seus territórios e tropas.');
  return converter(data, territorios.data, tropas.data);
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
    () =>
      salva
        ? avancarCidade({
            cidade: salva.cidade,
            tropas: salva.tropas,
            obras: salva.obras,
            treinos: salva.fila,
            agora,
            bonusTerritorios: salva.bonus,
          })
        : null,
    [salva, agora],
  );

  const comandar = useCallback(
    async (corpo: Record<string, unknown>) => {
      await chamarFuncao('cidade', corpo);
      await carregar();
    },
    [carregar],
  );

  return {
    cidade: atual?.cidade ?? null,
    obras: atual?.obras ?? [],
    tropas: atual?.tropas ?? exercito(),
    fila: atual?.treinos ?? [],
    soldados: atual ? soldadosNaConta(totalUnidades(atual.tropas), atual.treinos) : 0,
    bonus: salva?.bonus ?? null,
    territorio: salva?.territorio ?? null,
    territorios: salva?.territorios ?? 0,
    agora,
    erro,
    comandar,
  };
}
