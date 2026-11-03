// Estruturas dos territórios: torre de vigia, paliçada e entreposto. Uma por território, pagas com comida e ouro.
import { BALANCEAMENTO } from './balanceamento.ts';
import { RECURSOS, type Recursos, type TipoEstrutura, type Verificacao } from './tipos.ts';
import { MINUTO_MS } from './util.ts';

export type MotivoRecusaEstrutura = 'territorio_invalido' | 'ja_tem_estrutura' | 'recursos_insuficientes';

/** Estrutura de um território; vale a partir de `prontoEm` (ms). */
export type Estrutura = { tipo: TipoEstrutura; prontoEm: number };

export function custoEstrutura(tipo: TipoEstrutura): Recursos {
  return { ...BALANCEAMENTO.estruturas[tipo].custo };
}

export function tempoEstruturaMs(tipo: TipoEstrutura): number {
  return BALANCEAMENTO.estruturas[tipo].tempoMin * MINUTO_MS;
}

/**
 * A estrutura do tipo pedido já está pronta (as em construção ainda não têm efeito). Aceita a estrutura
 * secreta de outro jogador (tipo e prazo nulos), que nunca conta.
 */
export function estruturaAtiva(
  estrutura: { tipo: TipoEstrutura | null; prontoEm: number | null } | null | undefined,
  tipo: TipoEstrutura,
  agora: number,
): boolean {
  return !!estrutura && estrutura.tipo === tipo && estrutura.prontoEm !== null && estrutura.prontoEm <= agora;
}

/** Confere a construção: o território é do jogador, ainda não tem estrutura (pronta ou em obra) e há recursos. */
export function verificarEstrutura(entrada: {
  tipo: TipoEstrutura;
  territorioDoJogador: boolean;
  jaTemEstrutura: boolean;
  recursos: Recursos;
  agora: number;
}): Verificacao<{ custo: Recursos; prontoEm: number }, MotivoRecusaEstrutura> {
  if (!entrada.territorioDoJogador) return { ok: false, motivo: 'territorio_invalido' };
  if (entrada.jaTemEstrutura) return { ok: false, motivo: 'ja_tem_estrutura' };
  const custo = custoEstrutura(entrada.tipo);
  if (RECURSOS.some((r) => entrada.recursos[r] < custo[r])) return { ok: false, motivo: 'recursos_insuficientes' };
  return { ok: true, custo, prontoEm: entrada.agora + tempoEstruturaMs(entrada.tipo) };
}
