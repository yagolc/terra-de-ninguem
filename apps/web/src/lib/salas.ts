// Salas: partidas em paralelo. O jogo mostra uma sala por vez (a escolhida fica no aparelho); as consultas e os
// comandos usam a temporada dela. Quem nunca escolheu cai na Sala principal, como antes das salas.
import { chamarFuncao } from './funcoes';
import { supabase } from './supabase';

export const SALA_PRINCIPAL = '00000000-0000-0000-0000-000000000001';
const CHAVE = 'terra:sala';

export type TemporadaDaSala = {
  id: string;
  numero: number;
  status: 'ativa' | 'encerrada';
  inicio: number;
  fimPrevisto: number | null;
};

export type Sala = {
  id: string;
  nome: string;
  principal: boolean;
  acesso: 'aberta' | 'convite';
  jogadoresMaximo: number;
  duracaoDias: number;
  status: 'aberta' | 'arquivada';
  /** A temporada em andamento ou, sem ela, a última (null: sala sem temporada). */
  temporada: TemporadaDaSala | null;
  /** Vencedor da última temporada encerrada da sala: o herdeiro do trono caído. */
  herdeiroId: string | null;
  /** Quem tem cidade na temporada em andamento. */
  jogadores: number;
  minhaCidade: boolean;
  /** Pode fundar cidade (sala aberta, ou convidado). */
  convidado: boolean;
  convidados: string[];
};

let escolhida: Sala | null = null;

/** A sala aberta no jogo (null antes de carregar). */
export function salaEscolhida(): Sala | null {
  return escolhida;
}

/** A temporada em andamento da sala aberta, para as consultas (null se ela acabou). */
export function temporadaEmAndamento(): TemporadaDaSala | null {
  return escolhida?.temporada?.status === 'ativa' ? escolhida.temporada : null;
}

/** A temporada que as telas mostram: a em andamento ou, sem ela, a última da sala (tela de fim). */
export function temporadaDaSala(): TemporadaDaSala | null {
  return escolhida?.temporada ?? null;
}

export function definirSalaEscolhida(sala: Sala): void {
  escolhida = sala;
  try {
    localStorage.setItem(CHAVE, sala.id);
  } catch {
    // Sem armazenamento (aba anônima): a escolha vale até fechar a página.
  }
}

/** A sala pedida no endereço (`?sala=`, dos avisos no celular) ou a última escolhida neste aparelho. */
export function salaPedida(): string | null {
  const doEndereco = new URLSearchParams(location.search).get('sala');
  if (doEndereco) {
    // Tira do endereço para recarregar a página não voltar para ela depois de trocar.
    history.replaceState(null, '', location.pathname + location.hash);
    return doEndereco;
  }
  try {
    return localStorage.getItem(CHAVE);
  } catch {
    return null;
  }
}

type LinhaSala = {
  id: string;
  nome: string;
  principal: boolean;
  acesso: 'aberta' | 'convite';
  jogadores_maximo: number;
  duracao_dias: number;
  status: 'aberta' | 'arquivada';
  criado_em: string;
};
type LinhaTemporada = {
  id: string;
  sala_id: string;
  numero: number;
  status: 'ativa' | 'encerrada' | 'preparando';
  inicio: string;
  fim_previsto: string | null;
  vencedor_id: string | null;
};

const converter = (t: LinhaTemporada): TemporadaDaSala => ({
  id: t.id,
  numero: t.numero,
  status: t.status === 'ativa' ? 'ativa' : 'encerrada',
  inicio: Date.parse(t.inicio),
  fimPrevisto: t.fim_previsto ? Date.parse(t.fim_previsto) : null,
});

/** Todas as salas (a principal primeiro, as arquivadas fora), com a temporada de cada uma e a situação do jogador. */
export async function buscarSalas(meuId: string): Promise<Sala[]> {
  if (!supabase) throw new Error('O Supabase não está configurado.');
  const [salas, temporadas, cidades, membros] = await Promise.all([
    supabase
      .from('salas')
      .select('id, nome, principal, acesso, jogadores_maximo, duracao_dias, status, criado_em')
      .neq('status', 'arquivada')
      .order('criado_em')
      .returns<LinhaSala[]>(),
    supabase
      .from('temporadas')
      .select('id, sala_id, numero, status, inicio, fim_previsto, vencedor_id')
      .order('numero', { ascending: false })
      .returns<LinhaTemporada[]>(),
    // O RLS devolve só as cidades do próprio jogador.
    supabase.from('cidades').select('temporada_id').eq('jogador_id', meuId).returns<{ temporada_id: string }[]>(),
    supabase.from('salas_membros').select('sala_id, jogador_id').returns<{ sala_id: string; jogador_id: string }[]>(),
  ]);
  if (salas.error) return await salaPrincipalSemSalas(meuId);
  if (temporadas.error || !salas.data || !temporadas.data) throw new Error('Não foi possível carregar as salas.');

  const minhas = new Set((cidades.data ?? []).map((c) => c.temporada_id));
  const ativas = temporadas.data.filter((t) => t.status === 'ativa');
  // Quantos têm cidade em cada temporada em andamento (a função devolve só jogador, raça e cor).
  const contagens = await Promise.all(
    ativas.map(async (t) => {
      const { data } = await supabase!.rpc('cidades_na_temporada', { p_temporada: t.id });
      return [t.id, Array.isArray(data) ? data.length : 0] as const;
    }),
  );
  const jogadoresPorTemporada = new Map(contagens);

  const lista = salas.data.map((s): Sala => {
    const daSala = temporadas.data!.filter((t) => t.sala_id === s.id && t.status !== 'preparando');
    const linha = daSala.find((t) => t.status === 'ativa') ?? daSala[0] ?? null;
    const anterior = daSala.find((t) => t.status === 'encerrada' && (!linha || t.numero < linha.numero || linha.status !== 'ativa'));
    const convidados = (membros.data ?? []).filter((m) => m.sala_id === s.id).map((m) => m.jogador_id);
    return {
      id: s.id,
      nome: s.nome,
      principal: s.principal,
      acesso: s.acesso,
      jogadoresMaximo: s.jogadores_maximo,
      duracaoDias: s.duracao_dias,
      status: s.status,
      temporada: linha ? converter(linha) : null,
      herdeiroId: anterior?.vencedor_id ?? null,
      jogadores: linha?.status === 'ativa' ? (jogadoresPorTemporada.get(linha.id) ?? 0) : 0,
      minhaCidade: !!linha && minhas.has(linha.id),
      convidado: s.acesso === 'aberta' || convidados.includes(meuId),
      convidados,
    };
  });
  return lista.sort((a, b) => Number(b.principal) - Number(a.principal));
}

/** Banco ainda sem a tabela de salas: a Sala principal montada com a temporada ativa, como antes. */
async function salaPrincipalSemSalas(meuId: string): Promise<Sala[]> {
  const { data: temporadas } = await supabase!
    .from('temporadas')
    .select('id, numero, status, inicio, fim_previsto, vencedor_id')
    .order('numero', { ascending: false })
    .returns<Omit<LinhaTemporada, 'sala_id'>[]>();
  const lista = (temporadas ?? []).map((t) => ({ ...t, sala_id: SALA_PRINCIPAL }));
  const linha = lista.find((t) => t.status === 'ativa') ?? lista.find((t) => t.status === 'encerrada') ?? null;
  const anterior = lista.find((t) => t.status === 'encerrada' && (!linha || t.numero < linha.numero || linha.status !== 'ativa'));
  const { data: cidade } = linha
    ? await supabase!.from('cidades').select('id').eq('temporada_id', linha.id).eq('jogador_id', meuId).maybeSingle<{ id: string }>()
    : { data: null };
  return [
    {
      id: SALA_PRINCIPAL,
      nome: 'Sala principal',
      principal: true,
      acesso: 'aberta',
      jogadoresMaximo: 8,
      duracaoDias: 21,
      status: 'aberta',
      temporada: linha ? converter(linha) : null,
      herdeiroId: anterior?.vencedor_id ?? null,
      jogadores: 0,
      minhaCidade: !!cidade,
      convidado: true,
      convidados: [],
    },
  ];
}

/** Partidas em andamento em que o jogador tem cidade (o limite conta todas as salas). */
export function partidasEmAndamento(salas: readonly Sala[]): number {
  return salas.filter((s) => s.minhaCidade && s.temporada?.status === 'ativa').length;
}

// ---------------------------------------------------------------------------
// Comandos do organizador (função `salas`).
// ---------------------------------------------------------------------------

export type NovaSala = {
  nome: string;
  acesso: 'aberta' | 'convite';
  jogadoresMaximo: number;
  duracaoDias: number;
  semente: number | null;
  convidados: string[];
};

export function criarSala(s: NovaSala) {
  return chamarFuncao<{ sala_id: string; temporada_id: string; numero: number; semente: number }>('salas', {
    acao: 'criar_sala',
    nome: s.nome,
    acesso: s.acesso,
    jogadores_maximo: s.jogadoresMaximo,
    duracao_dias: s.duracaoDias,
    semente: s.semente,
    convidados: s.convidados,
  });
}

export function novaTemporadaDaSala(salaId: string, semente: number | null) {
  return chamarFuncao('salas', { acao: 'nova_temporada', sala_id: salaId, semente });
}

export function arquivarSala(salaId: string) {
  return chamarFuncao('salas', { acao: 'arquivar_sala', sala_id: salaId });
}

export function mudarConvite(salaId: string, jogadorId: string, convidar: boolean) {
  return chamarFuncao('salas', { acao: convidar ? 'convidar' : 'desconvidar', sala_id: salaId, jogador_id: jogadorId });
}

export type CidadeNaTemporada = { jogador_id: string; raca: string | null; cor: string | null };

/**
 * Quem tem cidade na temporada, com raça e cor no mapa (a cor é por sala). Com o banco antigo, só a raça, e a cor
 * fica a do perfil.
 */
export async function cidadesNaTemporada(temporadaId: string): Promise<{ data: CidadeNaTemporada[] | null }> {
  if (!supabase) return { data: null };
  const nova = await supabase.rpc('cidades_na_temporada', { p_temporada: temporadaId });
  if (!nova.error) return { data: (nova.data ?? []) as CidadeNaTemporada[] };
  const antiga = await supabase.rpc('racas_na_temporada', { p_temporada: temporadaId });
  return { data: antiga.error ? null : ((antiga.data ?? []) as { jogador_id: string; raca: string | null }[]).map((r) => ({ ...r, cor: null })) };
}

/** Troca a cor de cada jogador pela cor dele nesta sala (quem não tem cidade nela fica com a do perfil). */
export function comCorDaSala<J extends { id: string; cor: string | null }>(jogadores: J[], cidades: CidadeNaTemporada[] | null): J[] {
  const cor = new Map((cidades ?? []).flatMap((c) => (c.cor ? [[c.jogador_id, c.cor] as const] : [])));
  return jogadores.map((j) => (cor.has(j.id) ? { ...j, cor: cor.get(j.id)! } : j));
}
