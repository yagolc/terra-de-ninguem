// Pombos-correio: cartas entre jogadores, pactos de não agressão e acesso militar (GDD: "Pombal e pactos").
import { BALANCEAMENTO } from './balanceamento.ts';
import { distancia } from './marcha.ts';
import { HORA_MS, MINUTO_MS } from './util.ts';

/** `nao_agressao`: nenhum dos dois ataca o outro. `acesso_militar`: as tropas de cada um atravessam as terras do outro. */
export const TIPOS_PROPOSTA = ['nao_agressao', 'acesso_militar'] as const;
export type TipoProposta = (typeof TIPOS_PROPOSTA)[number];

type Ponto = { x: number; y: number };

/** Quantas cartas podem estar voando ao mesmo tempo com o Pombal neste nível. */
export function pombosDoPombal(nivelPombal: number): number {
  return Math.max(0, nivelPombal) * BALANCEAMENTO.pombos.pombosPorNivel;
}

/** Léguas por hora do pombo com o Pombal neste nível (nível 0 conta como 1). */
export function velocidadePombo(nivelPombal: number): number {
  const P = BALANCEAMENTO.pombos;
  return P.velocidade * (1 + P.bonusVelocidadePorNivel * Math.max(0, nivelPombal - 1));
}

/** Tempo de voo da carta em ms (arredondado ao segundo), da cidade de quem manda até a de quem recebe. */
export function duracaoVooMs(origem: Ponto, destino: Ponto, nivelPombal: number): number {
  const ms = Math.max(
    (distancia(origem, destino) / velocidadePombo(nivelPombal)) * HORA_MS,
    BALANCEAMENTO.pombos.duracaoMinimaMin * MINUTO_MS,
  );
  return Math.round(ms / 1000) * 1000;
}

/** Texto da carta sem espaços nas pontas e com no máximo uma linha em branco seguida. */
export function limparTextoCarta(texto: string): string {
  return texto
    .trim()
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

export type MotivoRecusaCarta =
  | 'sem_pombal'
  | 'sem_pombos'
  | 'destinatario_invalido'
  | 'carta_vazia'
  | 'texto_longo'
  | 'proposta_invalida'
  | 'horas_invalidas';

/**
 * Confere uma carta antes de o pombo sair. Precisa de Pombal e de um pombo livre (cada carta ainda voando
 * ocupa um); vai para outro jogador desta temporada; leva texto, uma proposta de pacto ou os dois.
 */
export function verificarCarta(entrada: {
  nivelPombal: number;
  /** Cartas do jogador que ainda não chegaram. */
  emVoo: number;
  remetenteId: string;
  destinatarioId: string;
  /** O destinatário tem cidade nesta temporada. */
  destinatarioNaTemporada: boolean;
  texto: unknown;
  proposta: unknown;
  horasPacto: unknown;
}):
  | { ok: true; texto: string; proposta: TipoProposta | null; horasPacto: number | null }
  | { ok: false; motivo: MotivoRecusaCarta } {
  const P = BALANCEAMENTO.pombos;
  if (entrada.nivelPombal < 1) return { ok: false, motivo: 'sem_pombal' };
  if (entrada.emVoo >= pombosDoPombal(entrada.nivelPombal)) return { ok: false, motivo: 'sem_pombos' };
  if (!entrada.destinatarioNaTemporada || entrada.destinatarioId === entrada.remetenteId) {
    return { ok: false, motivo: 'destinatario_invalido' };
  }

  const texto = limparTextoCarta(typeof entrada.texto === 'string' ? entrada.texto : '');
  if (texto.length > P.tamanhoTexto) return { ok: false, motivo: 'texto_longo' };

  let proposta: TipoProposta | null = null;
  let horasPacto: number | null = null;
  if (entrada.proposta !== undefined && entrada.proposta !== null) {
    const tipo = TIPOS_PROPOSTA.find((t) => t === entrada.proposta);
    if (!tipo) return { ok: false, motivo: 'proposta_invalida' };
    const horas = entrada.horasPacto;
    if (typeof horas !== 'number' || !Number.isInteger(horas) || horas < P.pacto.horasMinimas || horas > P.pacto.horasMaximas) {
      return { ok: false, motivo: 'horas_invalidas' };
    }
    proposta = tipo;
    horasPacto = horas;
  }
  if (texto.length === 0 && proposta === null) return { ok: false, motivo: 'carta_vazia' };
  return { ok: true, texto, proposta, horasPacto };
}

/** Até quando quem recebeu pode responder à proposta (ms). */
export function validadeDaProposta(chegaEm: number): number {
  return chegaEm + BALANCEAMENTO.pombos.pacto.validadePropostaHoras * HORA_MS;
}

export type MotivoRecusaRespostaPacto = 'sem_proposta' | 'ainda_voando' | 'ja_respondida' | 'proposta_expirada' | 'objetivo_em_jogo';

/**
 * Confere a resposta a uma proposta de pacto: só quem recebeu responde, uma vez, depois de a carta chegar
 * e antes de a proposta expirar. Aceita, o pacto vale a partir de agora pelas horas propostas.
 * `objetivoEmJogo`: um dos dois está segurando o objetivo cumprido; aí não dá para aceitar não agressão (recusar dá).
 */
export function verificarRespostaPacto(entrada: {
  carta: { destinatarioId: string; proposta: TipoProposta | null; horasPacto: number | null; chegaEm: number; respondida: boolean };
  jogadorId: string;
  aceitar: boolean;
  agora: number;
  objetivoEmJogo?: boolean;
}): { ok: true; pactoAte: number | null } | { ok: false; motivo: MotivoRecusaRespostaPacto } {
  const { carta, agora } = entrada;
  if (carta.destinatarioId !== entrada.jogadorId || carta.proposta === null || carta.horasPacto === null) {
    return { ok: false, motivo: 'sem_proposta' };
  }
  if (agora < carta.chegaEm) return { ok: false, motivo: 'ainda_voando' };
  if (carta.respondida) return { ok: false, motivo: 'ja_respondida' };
  if (agora > validadeDaProposta(carta.chegaEm)) return { ok: false, motivo: 'proposta_expirada' };
  if (entrada.aceitar && entrada.objetivoEmJogo && carta.proposta === 'nao_agressao') return { ok: false, motivo: 'objetivo_em_jogo' };
  return { ok: true, pactoAte: entrada.aceitar ? agora + carta.horasPacto * HORA_MS : null };
}

/** Um pacto aceito: os dois jogadores e quando acaba (ms). Sem `tipo`, é de não agressão. */
export type Pacto = { jogadores: readonly [string, string]; ate: number; tipo?: TipoProposta };

/** Fim do pacto do tipo (não agressão, se omitido) em vigor entre dois jogadores (o que dura mais), ou null. */
export function pactoEntre(
  pactos: readonly Pacto[],
  a: string,
  b: string,
  agora: number,
  tipo: TipoProposta = 'nao_agressao',
): number | null {
  let fim: number | null = null;
  for (const p of pactos) {
    const [x, y] = p.jogadores;
    const mesmoPar = (x === a && y === b) || (x === b && y === a);
    if (mesmoPar && (p.tipo ?? 'nao_agressao') === tipo && p.ate > agora && (fim === null || p.ate > fim)) fim = p.ate;
  }
  return fim;
}

/** Jogadores que têm acesso militar em vigor com `jogadorId` (as terras deles viram corredor para ele). */
export function parceirosDeAcesso(pactos: readonly Pacto[], jogadorId: string, agora: number): string[] {
  const parceiros = new Set<string>();
  for (const p of pactos) {
    if (p.tipo !== 'acesso_militar' || p.ate <= agora) continue;
    const [x, y] = p.jogadores;
    if (x === jogadorId) parceiros.add(y);
    else if (y === jogadorId) parceiros.add(x);
  }
  return [...parceiros].sort();
}
