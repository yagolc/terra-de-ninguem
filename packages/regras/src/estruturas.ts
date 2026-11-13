// Estruturas dos territórios: torre de vigia, paliçada, entreposto e acampamento militar. Uma por território; o dono
// pode destruir a dele (sem devolver nada) para construir outra. A estrada fica à parte: um território pode ter as duas.
import { BALANCEAMENTO } from './balanceamento.ts';
import { RECURSOS, type Recursos, type TipoEstrutura, type Verificacao } from './tipos.ts';
import { MINUTO_MS } from './util.ts';

export type MotivoRecusaEstrutura =
  | 'territorio_invalido'
  | 'ja_tem_estrutura'
  | 'recursos_insuficientes'
  | 'acampamento_na_cidade'
  | 'limite_acampamentos';

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

/**
 * Confere a construção: o território é do jogador, ainda não tem estrutura (pronta ou em obra) e há recursos. O
 * acampamento militar não vai na cidade principal e respeita `acampamento.maximoPorJogador` (contando os em obra).
 */
export function verificarEstrutura(entrada: {
  tipo: TipoEstrutura;
  territorioDoJogador: boolean;
  jaTemEstrutura: boolean;
  recursos: Recursos;
  agora: number;
  /** O território é a cidade principal do jogador. */
  cidadePrincipal?: boolean;
  /** Acampamentos que o jogador já tem (prontos ou em obra). */
  acampamentosDoJogador?: number;
}): Verificacao<{ custo: Recursos; prontoEm: number }, MotivoRecusaEstrutura> {
  if (!entrada.territorioDoJogador) return { ok: false, motivo: 'territorio_invalido' };
  if (entrada.jaTemEstrutura) return { ok: false, motivo: 'ja_tem_estrutura' };
  if (entrada.tipo === 'acampamento') {
    if (entrada.cidadePrincipal) return { ok: false, motivo: 'acampamento_na_cidade' };
    if ((entrada.acampamentosDoJogador ?? 0) >= BALANCEAMENTO.acampamento.maximoPorJogador) {
      return { ok: false, motivo: 'limite_acampamentos' };
    }
  }
  const custo = custoEstrutura(entrada.tipo);
  if (RECURSOS.some((r) => entrada.recursos[r] < custo[r])) return { ok: false, motivo: 'recursos_insuficientes' };
  return { ok: true, custo, prontoEm: entrada.agora + tempoEstruturaMs(entrada.tipo) };
}

export type MotivoRecusaDestruicao = 'territorio_invalido' | 'sem_estrutura';

/**
 * Confere a demolição: só o dono do território destrói a estrutura dele (pronta ou em obra). Não devolve nada; abre
 * espaço para outra. Destruir um acampamento manda para a cidade os lotes que ficariam prontos nele.
 */
export function verificarDestruicaoEstrutura(entrada: {
  territorioDoJogador: boolean;
  estruturaDoJogador: boolean;
}): Verificacao<object, MotivoRecusaDestruicao> {
  if (!entrada.territorioDoJogador) return { ok: false, motivo: 'territorio_invalido' };
  if (!entrada.estruturaDoJogador) return { ok: false, motivo: 'sem_estrutura' };
  return { ok: true };
}

export type MotivoRecusaEstrada = 'territorio_invalido' | 'ja_tem_estrada' | 'recursos_insuficientes';

export function custoEstrada(): Recursos {
  return { ...BALANCEAMENTO.estrada.custo };
}

export function tempoEstradaMs(): number {
  return BALANCEAMENTO.estrada.tempoMin * MINUTO_MS;
}

/** A estrada está pronta (em obra ainda não acelera nada). */
export function estradaPronta(estrada: { prontoEm: number } | null | undefined, agora: number): boolean {
  return !!estrada && estrada.prontoEm <= agora;
}

/** Confere a obra da estrada: o território é do jogador, ainda não tem estrada (pronta ou em obra) e há recursos. */
export function verificarEstrada(entrada: {
  territorioDoJogador: boolean;
  jaTemEstrada: boolean;
  recursos: Recursos;
  agora: number;
}): Verificacao<{ custo: Recursos; prontoEm: number }, MotivoRecusaEstrada> {
  if (!entrada.territorioDoJogador) return { ok: false, motivo: 'territorio_invalido' };
  if (entrada.jaTemEstrada) return { ok: false, motivo: 'ja_tem_estrada' };
  const custo = custoEstrada();
  if (RECURSOS.some((r) => entrada.recursos[r] < custo[r])) return { ok: false, motivo: 'recursos_insuficientes' };
  return { ok: true, custo, prontoEm: entrada.agora + tempoEstradaMs() };
}

/**
 * Quanto mais rápido anda uma marcha de movimento: `estrada.multiplicadorVelocidade` se a saída e a chegada têm
 * estrada pronta; 1 se falta estrada numa das pontas. Ataques não usam estrada.
 */
export function multiplicadorEstrada(origemComEstrada: boolean, destinoComEstrada: boolean): number {
  return origemComEstrada && destinoComEstrada ? BALANCEAMENTO.estrada.multiplicadorVelocidade : 1;
}
