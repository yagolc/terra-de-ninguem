// Salas: partidas em paralelo. Cada sala tem a sua sequência de temporadas (mapa, placar, objetivos, herdeiro).
// Só o organizador cria salas; cada jogador joga no máximo `salas.partidasPorJogador` partidas ao mesmo tempo.
import { BALANCEAMENTO } from './balanceamento.ts';
import { chaveDoNome } from './nome.ts';
import type { Verificacao } from './tipos.ts';

export const ACESSOS_SALA = ['aberta', 'convite'] as const;
export type AcessoSala = (typeof ACESSOS_SALA)[number];

export type ConfigSala = {
  nome: string;
  acesso: AcessoSala;
  jogadoresMaximo: number;
  duracaoDias: number;
};

export type MotivoRecusaSala =
  | 'nao_organizador'
  | 'nome_vazio'
  | 'nome_longo'
  | 'nome_em_uso'
  | 'acesso_invalido'
  | 'jogadores_invalido'
  | 'duracao_invalida'
  | 'semente_invalida';

/** Semente do mapa: inteiro de 0 a 999.999.999 (o `temporada:nova` usa a mesma faixa). */
export function sementeValida(v: unknown): v is number {
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 999_999_999;
}

/** Confere os dados de uma sala nova. `semente` nula: o servidor sorteia. */
export function verificarSala(entrada: {
  organizador: boolean;
  nome: unknown;
  acesso: unknown;
  jogadoresMaximo: unknown;
  duracaoDias: unknown;
  semente: unknown;
  /** Nomes das salas que já existem (não pode repetir, sem contar maiúsculas e acentos). */
  nomesDasOutras: readonly string[];
}): Verificacao<{ sala: ConfigSala; semente: number | null }, MotivoRecusaSala> {
  const s = BALANCEAMENTO.salas;
  if (!entrada.organizador) return { ok: false, motivo: 'nao_organizador' };
  const nome = String(entrada.nome ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!nome) return { ok: false, motivo: 'nome_vazio' };
  if ([...nome].length > s.nomeMaximo) return { ok: false, motivo: 'nome_longo' };
  const chave = chaveDoNome(nome);
  if (entrada.nomesDasOutras.some((outro) => chaveDoNome(outro) === chave)) return { ok: false, motivo: 'nome_em_uso' };
  const acesso = ACESSOS_SALA.find((a) => a === entrada.acesso);
  if (!acesso) return { ok: false, motivo: 'acesso_invalido' };
  const jogadores = entrada.jogadoresMaximo;
  if (typeof jogadores !== 'number' || !Number.isInteger(jogadores) || jogadores < s.jogadoresMinimo || jogadores > BALANCEAMENTO.mapa.jogadoresMaximo) {
    return { ok: false, motivo: 'jogadores_invalido' };
  }
  const dias = entrada.duracaoDias;
  if (typeof dias !== 'number' || !Number.isInteger(dias) || dias < s.duracaoMinimaDias || dias > s.duracaoMaximaDias) {
    return { ok: false, motivo: 'duracao_invalida' };
  }
  const semente = entrada.semente ?? null;
  if (semente !== null && !sementeValida(semente)) return { ok: false, motivo: 'semente_invalida' };
  return { ok: true, sala: { nome, acesso, jogadoresMaximo: jogadores, duracaoDias: dias }, semente };
}

export type MotivoRecusaEntradaSala = 'sala_arquivada' | 'sem_convite' | 'partidas_demais';

/**
 * Pode fundar cidade nesta sala? Quem já tem cidade na temporada dela sempre pode (entrar de novo não muda nada).
 * A vaga no mapa é conferida depois, ao escolher o território.
 */
export function verificarEntradaSala(entrada: {
  acesso: AcessoSala;
  arquivada: boolean;
  /** Está em `salas_membros` (só conta nas salas por convite). */
  convidado: boolean;
  jaTemCidade: boolean;
  /** Cidades do jogador em temporadas ativas de outras salas. */
  partidasEmAndamento: number;
}): Verificacao<object, MotivoRecusaEntradaSala> {
  if (entrada.jaTemCidade) return { ok: true };
  if (entrada.arquivada) return { ok: false, motivo: 'sala_arquivada' };
  if (entrada.acesso === 'convite' && !entrada.convidado) return { ok: false, motivo: 'sem_convite' };
  if (entrada.partidasEmAndamento >= BALANCEAMENTO.salas.partidasPorJogador) return { ok: false, motivo: 'partidas_demais' };
  return { ok: true };
}
