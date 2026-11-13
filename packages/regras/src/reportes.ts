// Feedback dos jogadores: relatos de bug e sugestões, no padrão de um rastreador de problemas (tipo, área,
// gravidade, passos para reproduzir, status e votos). O organizador muda o status e responde.
import { BALANCEAMENTO } from './balanceamento.ts';
import type { Verificacao } from './tipos.ts';

export const TIPOS_REPORTE = ['bug', 'sugestao'] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

export const AREAS_REPORTE = ['cidade', 'mapa', 'exercito', 'diplomacia', 'objetivos', 'loja', 'perfil', 'avisos', 'outro'] as const;
export type AreaReporte = (typeof AREAS_REPORTE)[number];

/** Gravidade de um bug: crítica = não dá para jogar ou perdeu progresso; baixa = detalhe visual. */
export const GRAVIDADES = ['baixa', 'media', 'alta', 'critica'] as const;
export type Gravidade = (typeof GRAVIDADES)[number];

/** Fluxo do status: novo → em análise → planejado → em andamento → resolvido (ou não será feito / duplicado). */
export const STATUS_REPORTE = ['novo', 'em_analise', 'planejado', 'em_andamento', 'resolvido', 'nao_sera_feito', 'duplicado'] as const;
export type StatusReporte = (typeof STATUS_REPORTE)[number];

/** Status que encerram o item (saem da lista de abertos). */
export const STATUS_FECHADOS: readonly StatusReporte[] = ['resolvido', 'nao_sera_feito', 'duplicado'];

export type Reporte = {
  tipo: TipoReporte;
  area: AreaReporte;
  titulo: string;
  descricao: string;
  /** Só bug: gravidade, passos para reproduzir, o que esperava e o que aconteceu. */
  gravidade: Gravidade | null;
  passos: string;
  esperado: string;
  aconteceu: string;
};

export type MotivoRecusaReporte =
  | 'tipo_invalido'
  | 'area_invalida'
  | 'gravidade_invalida'
  | 'titulo_curto'
  | 'titulo_longo'
  | 'texto_vazio'
  | 'texto_longo'
  | 'envios_demais';

/** Uma linha só, sem espaços repetidos nem nas pontas. */
function linha(v: unknown): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Texto de várias linhas: sem espaços nas pontas e no máximo uma linha em branco seguida. */
function texto(v: unknown): string {
  return String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');
}

const tamanho = (s: string) => [...s].length;

/**
 * Confere um relato novo. Bug precisa de gravidade e de pelo menos o que aconteceu (ou a descrição); sugestão,
 * da descrição. `enviosNaUltimaHora` limita a `reportes.porHora`.
 */
export function verificarReporte(entrada: {
  tipo: unknown;
  area: unknown;
  titulo: unknown;
  descricao?: unknown;
  gravidade?: unknown;
  passos?: unknown;
  esperado?: unknown;
  aconteceu?: unknown;
  enviosNaUltimaHora: number;
}): Verificacao<{ reporte: Reporte }, MotivoRecusaReporte> {
  const { tituloMinimo, tituloMaximo, textoMaximo, porHora } = BALANCEAMENTO.reportes;
  const tipo = TIPOS_REPORTE.find((t) => t === entrada.tipo);
  if (!tipo) return { ok: false, motivo: 'tipo_invalido' };
  const area = AREAS_REPORTE.find((a) => a === entrada.area);
  if (!area) return { ok: false, motivo: 'area_invalida' };
  const gravidade = tipo === 'bug' ? (GRAVIDADES.find((g) => g === entrada.gravidade) ?? null) : null;
  if (tipo === 'bug' && !gravidade) return { ok: false, motivo: 'gravidade_invalida' };

  const titulo = linha(entrada.titulo);
  if (tamanho(titulo) < tituloMinimo) return { ok: false, motivo: 'titulo_curto' };
  if (tamanho(titulo) > tituloMaximo) return { ok: false, motivo: 'titulo_longo' };

  const descricao = texto(entrada.descricao);
  const passos = tipo === 'bug' ? texto(entrada.passos) : '';
  const esperado = tipo === 'bug' ? texto(entrada.esperado) : '';
  const aconteceu = tipo === 'bug' ? texto(entrada.aconteceu) : '';
  if ([descricao, passos, esperado, aconteceu].some((t) => tamanho(t) > textoMaximo)) return { ok: false, motivo: 'texto_longo' };
  if (tipo === 'bug' ? !aconteceu && !descricao : !descricao) return { ok: false, motivo: 'texto_vazio' };

  if (entrada.enviosNaUltimaHora >= porHora) return { ok: false, motivo: 'envios_demais' };
  return { ok: true, reporte: { tipo, area, titulo, descricao, gravidade, passos, esperado, aconteceu } };
}

export type MotivoRecusaAtualizacaoReporte = 'nao_organizador' | 'status_invalido' | 'resposta_longa';

/** O organizador muda o status e escreve uma resposta (vazia = sem resposta). */
export function verificarAtualizacaoReporte(entrada: {
  organizador: boolean;
  status: unknown;
  resposta: unknown;
}): Verificacao<{ status: StatusReporte; resposta: string | null }, MotivoRecusaAtualizacaoReporte> {
  if (!entrada.organizador) return { ok: false, motivo: 'nao_organizador' };
  const status = STATUS_REPORTE.find((s) => s === entrada.status);
  if (!status) return { ok: false, motivo: 'status_invalido' };
  const resposta = texto(entrada.resposta);
  if (tamanho(resposta) > BALANCEAMENTO.reportes.respostaMaxima) return { ok: false, motivo: 'resposta_longa' };
  return { ok: true, status, resposta: resposta || null };
}

/** Palavras do título para achar relatos parecidos (sem acentos, maiúsculas e palavras curtas). */
export function palavrasDoTitulo(titulo: string): string[] {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4);
}

/**
 * Relatos parecidos com um título novo (pelo menos `minimo` palavras em comum), os de mais palavras em comum
 * primeiro. Serve para o jogador votar num que já existe em vez de repetir.
 */
export function reportesParecidos<T extends { titulo: string }>(titulo: string, existentes: readonly T[], minimo = 1, maximo = 3): T[] {
  const novas = new Set(palavrasDoTitulo(titulo));
  if (novas.size === 0) return [];
  return existentes
    .map((r) => ({ r, comuns: palavrasDoTitulo(r.titulo).filter((p) => novas.has(p)).length }))
    .filter((x) => x.comuns >= minimo)
    .sort((a, b) => b.comuns - a.comuns)
    .slice(0, maximo)
    .map((x) => x.r);
}
