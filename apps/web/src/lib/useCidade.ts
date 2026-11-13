import {
  TIPOS_PREDIO,
  avancarCidade,
  bonusDeTerritorios,
  bonusDosPovoados,
  bonusIntendente,
  efeitosRaca,
  exercito,
  mapearExercito,
  soldadosNaConta,
  somarExercitos,
  somarRecursos,
  totalUnidades,
  type EstadoCidade,
  type Especialidade,
  type Exercito,
  type Heroi,
  type Raca,
  type LoteTreino,
  type NiveisPredios,
  type Obra,
  type Recurso,
  type Recursos,
  type SituacaoMissoes,
  type Terreno,
  type TipoPovoado,
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
  raca: Raca | null;
  guarda_real: number;
  missoes: string[];
  predios: { tipo: TipoPredio; nivel: number }[];
  obras: { tipo: TipoPredio; pronto_em: string }[];
  filas_treino: { tipo_unidade: TipoUnidade; quantidade: number; pronto_em: string; territorio_id: string | null }[];
};

/** Lote na fila do Quartel; `territorioId`: acampamento militar onde fica pronto (null = cidade). */
export type LoteNaFila = LoteTreino & { territorioId: string | null };

/** Acampamento militar do jogador (um por jogador), com o nome do território. */
export type Acampamento = { territorioId: string; nome: string; prontoEm: number };

type TerritorioDoJogador = { id: string; nome: string; terreno: Terreno; bonus_recurso: Recurso };
type LinhaTropas = { lanceiro: number; arqueiro: number; cavalaria: number };

type CidadeSalva = {
  cidade: EstadoCidade;
  obras: Obra[];
  bonus: Recursos;
  /** Tropas paradas nos territórios. */
  tropas: Exercito;
  /** Tropas em marcha: também comem e ocupam população. */
  emMarcha: Exercito;
  fila: LoteNaFila[];
  acampamento: Acampamento | null;
  /** Território onde fica a cidade (null na temporada de testes, sem mapa). */
  territorio: TerritorioDoJogador | null;
  territorios: number;
  /** Vilas e cidades livres do jogador: o bônus delas depende da lealdade, então é calculado a cada segundo. */
  povoados: { tipo: TipoPovoado; nivel: number; lealDesde: number | null }[];
  /** Todos os territórios do jogador (o intendente fora da cidade usa o recurso de um deles). */
  meusTerritorios: TerritorioDoJogador[];
  heroi: Heroi | null;
  raca: Raca | null;
  /** Lanceiros da Guarda Real (só o herdeiro do trono tem). */
  guardaReal: number;
  /** Missões de início já resgatadas, e o que elas conferem além da cidade e das tropas. */
  missoes: string[];
  batedores: number;
  construcoes: number;
};

type LinhaHeroi = {
  nome: string;
  especialidade: Especialidade;
  nivel: number;
  territorio_id: string | null;
  marcha_id: string | null;
  treino_pronto_em: string | null;
  ferido_ate: string | null;
};

const lerData = (v: string | null) => (v ? Date.parse(v) : null);

type LinhaPovoado = { territorio_id: string; tipo: TipoPovoado; nivel: number; leal_desde: string | null };

function converter(
  linha: LinhaCidade,
  territorios: TerritorioDoJogador[],
  tropas: LinhaTropas[],
  marchas: LinhaTropas[],
  comEntreposto: Set<string>,
  povoados: LinhaPovoado[],
  heroi: LinhaHeroi | null,
  contagens: { batedores: number; construcoes: number },
  acampamento: Acampamento | null,
): CidadeSalva {
  const predios = Object.fromEntries(TIPOS_PREDIO.map((tipo) => [tipo, 0])) as NiveisPredios;
  for (const p of linha.predios) predios[p.tipo] = p.nivel;
  return {
    obras: linha.obras
      .map((o) => ({ tipo: o.tipo, prontoEm: Date.parse(o.pronto_em) }))
      .sort((a, b) => a.prontoEm - b.prontoEm),
    bonus: bonusDeTerritorios(
      territorios.map((t) => t.bonus_recurso),
      territorios.filter((t) => comEntreposto.has(t.id)).map((t) => t.bonus_recurso),
    ),
    tropas: somarExercitos(exercito(), ...tropas.map((t) => exercito(t))),
    emMarcha: somarExercitos(exercito(), ...marchas.map((m) => exercito(m))),
    fila: linha.filas_treino
      .map((l) => ({ tipo: l.tipo_unidade, quantidade: l.quantidade, prontoEm: Date.parse(l.pronto_em), territorioId: l.territorio_id }))
      .sort((a, b) => a.prontoEm - b.prontoEm),
    territorio: territorios.find((t) => t.id === linha.territorio_id) ?? null,
    territorios: territorios.length,
    meusTerritorios: territorios,
    raca: linha.raca,
    guardaReal: linha.guarda_real,
    missoes: linha.missoes,
    batedores: contagens.batedores,
    construcoes: contagens.construcoes,
    acampamento,
    heroi: heroi && {
      nome: heroi.nome,
      especialidade: heroi.especialidade,
      nivel: heroi.nivel,
      territorioId: heroi.territorio_id,
      marchaId: heroi.marcha_id,
      treinoProntoEm: lerData(heroi.treino_pronto_em),
      feridoAte: lerData(heroi.ferido_ate),
    },
    povoados: povoados
      .filter((p) => territorios.some((t) => t.id === p.territorio_id))
      .map((p) => ({ tipo: p.tipo, nivel: p.nivel, lealDesde: p.leal_desde ? Date.parse(p.leal_desde) : null })),
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
      'temporada_id, territorio_id, comida, madeira, ouro, populacao, trabalhadores_comida, trabalhadores_madeira, trabalhadores_ouro, atualizado_em, raca, guarda_real, missoes, predios(tipo, nivel), obras(tipo, pronto_em), filas_treino(tipo_unidade, quantidade, pronto_em, territorio_id), temporadas!inner(status)',
    )
    .eq('jogador_id', jogadorId)
    .eq('temporadas.status', 'ativa')
    .maybeSingle<LinhaCidade>();
  if (error) throw new Error('Não foi possível carregar sua cidade.');
  if (!data) return null;

  const [territorios, tropas, marchas, entrepostos, povoados, heroi, batedores, estruturas, estradas, acampamento] = await Promise.all([
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
    supabase
      .from('marchas')
      .select('lanceiro, arqueiro, cavalaria')
      .eq('temporada_id', data.temporada_id)
      .eq('jogador_id', jogadorId)
      .eq('status', 'a_caminho')
      .returns<LinhaTropas[]>(),
    // Entrepostos prontos: dobram o bônus do território, como no servidor.
    supabase
      .from('estruturas')
      .select('territorio_id')
      .eq('temporada_id', data.temporada_id)
      .eq('jogador_id', jogadorId)
      .eq('tipo', 'entreposto')
      .lte('pronto_em', new Date().toISOString())
      .returns<{ territorio_id: string }[]>(),
    supabase
      .from('povoados')
      .select('territorio_id, tipo, nivel, leal_desde')
      .eq('temporada_id', data.temporada_id)
      .returns<LinhaPovoado[]>(),
    // O RLS devolve só o herói do próprio jogador.
    supabase
      .from('herois')
      .select('nome, especialidade, nivel, territorio_id, marcha_id, treino_pronto_em, ferido_ate')
      .eq('temporada_id', data.temporada_id)
      .maybeSingle<LinhaHeroi>(),
    // Para as missões de início: batedores mandados e estruturas ou estradas feitas (prontas ou em obra).
    supabase
      .from('marchas')
      .select('id', { count: 'exact', head: true })
      .eq('temporada_id', data.temporada_id)
      .eq('jogador_id', jogadorId)
      .eq('tipo', 'reconhecimento'),
    supabase.from('estruturas').select('id', { count: 'exact', head: true }).eq('temporada_id', data.temporada_id).eq('jogador_id', jogadorId),
    supabase.from('estradas').select('id', { count: 'exact', head: true }).eq('temporada_id', data.temporada_id).eq('jogador_id', jogadorId),
    // Acampamento militar (o RLS só mostra as estruturas do próprio jogador com tipo e prazo).
    supabase
      .from('estruturas')
      .select('territorio_id, pronto_em, territorios(nome)')
      .eq('temporada_id', data.temporada_id)
      .eq('jogador_id', jogadorId)
      .eq('tipo', 'acampamento')
      .maybeSingle<{ territorio_id: string; pronto_em: string; territorios: { nome: string } | null }>(),
  ]);
  if (!territorios.data || !tropas.data || !marchas.data || !entrepostos.data || !povoados.data) {
    throw new Error('Não foi possível carregar seus territórios e tropas.');
  }
  const comEntreposto = new Set(entrepostos.data.map((e) => e.territorio_id));
  return converter(data, territorios.data, tropas.data, marchas.data, comEntreposto, povoados.data, heroi.data, {
    batedores: batedores.count ?? 0,
    construcoes: (estruturas.count ?? 0) + (estradas.count ?? 0),
  }, acampamento.data
    ? { territorioId: acampamento.data.territorio_id, nome: acampamento.data.territorios?.nome ?? 'Acampamento', prontoEm: Date.parse(acampamento.data.pronto_em) }
    : null);
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
      // A cidade é fundada na tela de Fundação (nome e raça); aqui ela já existe.
      const dados = await buscarCidade(jogadorId);
      setSalva(dados);
      setErro(dados ? null : 'Você ainda não fundou sua cidade nesta temporada.');
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

  // Povoados (ouro e população das vilas) e o limite a mais da raça (humano).
  const extras = useMemo(
    () =>
      salva ? { ...bonusDosPovoados(salva.povoados, agora), bonusPopulacaoMaxima: efeitosRaca(salva.raca).populacaoMaxima } : null,
    [salva, agora],
  );
  // Herói intendente: soma ao bônus dos territórios e, na cidade, ao crescimento da população.
  const intendente = useMemo(
    () =>
      salva
        ? bonusIntendente({
            heroi: salva.heroi,
            cidadeTerritorioId: salva.territorio?.id ?? null,
            recursoDoTerritorio: new Map(salva.meusTerritorios.map((t) => [t.id, t.bonus_recurso])),
            agora,
          })
        : null,
    [salva, agora],
  );
  // Crescimento da população a mais: intendente na cidade e raça.
  const bonusCrescimento = salva && intendente ? intendente.bonusCrescimento + efeitosRaca(salva.raca).crescimento : 0;
  const atual = useMemo(
    () =>
      salva && extras && intendente
        ? avancarCidade({
            cidade: salva.cidade,
            tropas: somarExercitos(salva.tropas, salva.emMarcha),
            obras: salva.obras,
            treinos: salva.fila,
            agora,
            bonusTerritorios: somarRecursos(salva.bonus, intendente.bonusTerritorios, efeitosRaca(salva.raca).producao),
            producaoFixaHora: extras.producaoFixaHora,
            populacaoExtra: extras.populacaoExtra,
            bonusPopulacaoMaxima: extras.bonusPopulacaoMaxima,
            bonusCrescimento,
          })
        : null,
    [salva, extras, intendente, agora, bonusCrescimento],
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
    // Paradas = total (já com deserção e lotes prontos) menos as que estão fora.
    tropas: atual && salva ? mapearExercito((t) => Math.max(0, atual.tropas[t] - salva.emMarcha[t])) : exercito(),
    emMarcha: salva?.emMarcha ?? exercito(),
    fila: atual?.treinos ?? [],
    acampamento: salva?.acampamento ?? null,
    // O herói também é um habitante: conta como soldado na população.
    soldados: atual ? soldadosNaConta(totalUnidades(atual.tropas), atual.treinos) + (salva?.heroi ? 1 : 0) : 0,
    bonus: salva && intendente ? somarRecursos(salva.bonus, intendente.bonusTerritorios, efeitosRaca(salva.raca).producao) : null,
    /** Ouro das cidades livres, população a mais das vilas (só as leais), limite da raça e crescimento a mais. */
    extras: extras ? { ...extras, bonusCrescimento } : null,
    territorio: salva?.territorio ?? null,
    territorios: salva?.territorios ?? 0,
    meusTerritorios: salva?.meusTerritorios ?? [],
    heroi: salva?.heroi ?? null,
    raca: salva?.raca ?? null,
    guardaReal: salva?.guardaReal ?? 0,
    /** Missões de início: as já resgatadas e a situação que diz quais estão cumpridas. */
    missoes:
      salva && atual
        ? {
            resgatadas: salva.missoes,
            situacao: {
              predios: atual.cidade.predios,
              soldados: totalUnidades(atual.tropas),
              territorios: salva.territorios,
              batedores: salva.batedores,
              construcoes: salva.construcoes,
              temHeroi: !!salva.heroi,
            } satisfies SituacaoMissoes,
          }
        : null,
    agora,
    erro,
    comandar,
  };
}
