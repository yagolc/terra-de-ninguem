// Perfil do jogador: bandeira (cor, segunda cor, padrão e emblema) e descrição. Vale para todas as temporadas.
import { FORMAS_EXCLUSIVAS, verificarEmblema, type CamadaEmblema } from './emblema.ts';
import { SEM_DESBLOQUEIOS, type Desbloqueios } from './loja.ts';
import { CORES_JOGADORES } from './territorios.ts';

/** Padrões do pacote de bandeiras exclusivas da loja (só quem comprou usa). */
export const PADROES_EXCLUSIVOS = ['divisa', 'pala', 'aspa', 'ponta', 'listrada'] as const;
export const PADROES_BANDEIRA = ['lisa', 'faixa', 'dividida', 'cruz', 'diagonal', 'xadrez', 'borda', ...PADROES_EXCLUSIVOS] as const;
export type PadraoBandeira = (typeof PADROES_BANDEIRA)[number];

/** Segunda cor: qualquer uma da paleta, mais preto, pergaminho e ouro (pode repetir a de outro jogador). */
export const CORES_SECUNDARIAS: readonly string[] = [...CORES_JOGADORES, '#1c1410', '#f1e6cf', '#d4a64a'];

/** Tamanho máximo da descrição do perfil. */
export const TAMANHO_DESCRICAO = 280;

/** O emblema fica no centro da bandeira (vazio = bandeira sem emblema). */
export type Bandeira = { cor: string; corSecundaria: string; padrao: PadraoBandeira; emblema: CamadaEmblema[] };

/** Valores de quem nunca mexeu no perfil (a cor principal vem da temporada). */
export const BANDEIRA_INICIAL: Omit<Bandeira, 'cor'> = { corSecundaria: '#f1e6cf', padrao: 'lisa', emblema: [] };

export type MotivoRecusaPerfil =
  | 'cor_invalida'
  | 'cor_em_uso'
  | 'cor_secundaria_invalida'
  | 'padrao_invalido'
  | 'emblema_invalido'
  | 'camadas_demais'
  | 'descricao_longa'
  | 'item_nao_comprado';

/**
 * Confere bandeira e descrição. A cor principal tem de ser da paleta (ou uma cor da loja que o jogador comprou) e
 * não pode ser a de outro jogador da temporada em andamento (`coresEmUso`, sem a do próprio jogador), para o mapa
 * continuar legível. Padrões e formas exclusivos só com o pacote de bandeiras da loja (`desbloqueios`).
 */
export function verificarPerfil(
  entrada: { cor: unknown; corSecundaria: unknown; padrao: unknown; emblema: unknown; descricao: unknown },
  coresEmUso: readonly (string | null)[],
  desbloqueios: Desbloqueios = SEM_DESBLOQUEIOS,
): { ok: true; bandeira: Bandeira; descricao: string } | { ok: false; motivo: MotivoRecusaPerfil } {
  const cor = String(entrada.cor ?? '').toLowerCase();
  if (![...CORES_JOGADORES, ...desbloqueios.cores].includes(cor)) return { ok: false, motivo: 'cor_invalida' };
  if (coresEmUso.some((c) => c?.toLowerCase() === cor)) return { ok: false, motivo: 'cor_em_uso' };

  const corSecundaria = String(entrada.corSecundaria ?? '').toLowerCase();
  if (![...CORES_SECUNDARIAS, ...desbloqueios.cores].includes(corSecundaria)) return { ok: false, motivo: 'cor_secundaria_invalida' };

  const padrao = PADROES_BANDEIRA.find((p) => p === entrada.padrao);
  if (!padrao) return { ok: false, motivo: 'padrao_invalido' };
  const emblema = verificarEmblema(entrada.emblema);
  if (!emblema.ok) return { ok: false, motivo: emblema.motivo };
  if (!desbloqueios.bandeirasExclusivas) {
    const exclusivo =
      (PADROES_EXCLUSIVOS as readonly string[]).includes(padrao) ||
      emblema.emblema.some((c) => (FORMAS_EXCLUSIVAS as readonly string[]).includes(c.forma));
    if (exclusivo) return { ok: false, motivo: 'item_nao_comprado' };
  }

  // Descrição: sem espaços nas pontas e no máximo duas linhas em branco seguidas.
  const descricao = String(entrada.descricao ?? '')
    .trim()
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
  if (descricao.length > TAMANHO_DESCRICAO) return { ok: false, motivo: 'descricao_longa' };

  return { ok: true, bandeira: { cor, corSecundaria, padrao, emblema: emblema.emblema }, descricao };
}
