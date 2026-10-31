// Reconhecimento: um batedor vai até um território vizinho, observa a defesa e volta com as informações.
import { BALANCEAMENTO } from './balanceamento.ts';
import { forcaDefesa } from './batalha.ts';
import { distancia } from './marcha.ts';
import { TIPOS_UNIDADE, type Exercito, type Ponto, type Terreno, type TipoUnidade, type Verificacao } from './tipos.ts';
import { multiplicadorVantagem } from './unidades.ts';
import { HORA_MS, MINUTO_MS, exercito, totalUnidades } from './util.ts';

export type MotivoRecusaReconhecimento = 'origem_invalida' | 'nao_vizinho' | 'alvo_proprio' | 'ouro_insuficiente';

/** Confere o envio de um batedor: sai de um território próprio para um vizinho que não é do jogador. */
export function verificarReconhecimento(entrada: {
  origemDoJogador: boolean;
  vizinhos: boolean;
  alvoProprio: boolean;
  ouro: number;
}): Verificacao<{ custoOuro: number }, MotivoRecusaReconhecimento> {
  if (!entrada.origemDoJogador) return { ok: false, motivo: 'origem_invalida' };
  if (!entrada.vizinhos) return { ok: false, motivo: 'nao_vizinho' };
  if (entrada.alvoProprio) return { ok: false, motivo: 'alvo_proprio' };
  const { custoOuro } = BALANCEAMENTO.reconhecimento;
  if (entrada.ouro < custoOuro) return { ok: false, motivo: 'ouro_insuficiente' };
  return { ok: true, custoOuro };
}

/** Tempo de ida (ou de volta) do batedor, em ms, arredondado ao segundo. */
export function duracaoReconhecimentoMs(origem: Ponto, destino: Ponto): number {
  const { velocidade, duracaoMinimaMin } = BALANCEAMENTO.reconhecimento;
  const ms = Math.max((distancia(origem, destino) / velocidade) * HORA_MS, duracaoMinimaMin * MINUTO_MS);
  return Math.round(ms / 1000) * 1000;
}

export type AnaliseDefesa = {
  /** Para cada tipo: quantas unidades só desse tipo vencem com a folga de conquista, mesmo com o azar máximo. */
  necessariosParaConquistar: Record<TipoUnidade, number>;
  /** Tipo que precisa de menos unidades (o melhor contra essa defesa). */
  melhorTipo: TipoUnidade | null;
};

/**
 * Estima o ataque necessário contra uma defesa observada, com as mesmas regras da batalha:
 * triângulo de vantagens, terreno, muralha, margem de conquista e a sorte no pior caso (−10%).
 */
export function analisarDefesa(entrada: { defensor: Exercito; terreno: Terreno; nivelMuralha: number }): AnaliseDefesa {
  const { defensor, terreno, nivelMuralha } = entrada;
  const { margemConquista, sorteMaxima } = BALANCEAMENTO.batalha;
  const necessarios = exercito();
  if (totalUnidades(defensor) === 0) {
    for (const tipo of TIPOS_UNIDADE) necessarios[tipo] = 1;
    return { necessariosParaConquistar: necessarios, melhorTipo: null };
  }
  const total = totalUnidades(defensor);
  for (const tipo of TIPOS_UNIDADE) {
    // Defesa contra um exército só desse tipo (a proporção importa, não o tamanho).
    const defesa = forcaDefesa(defensor, exercito({ [tipo]: 1 }), terreno, nivelMuralha);
    const vantagem = TIPOS_UNIDADE.reduce((soma, alvo) => soma + (defensor[alvo] / total) * multiplicadorVantagem(tipo, alvo), 0);
    const ataquePorUnidade = BALANCEAMENTO.unidades[tipo].ataque * vantagem * (1 - sorteMaxima);
    necessarios[tipo] = Math.max(1, Math.ceil((defesa * margemConquista) / ataquePorUnidade));
  }
  const melhorTipo = [...TIPOS_UNIDADE].sort((a, b) => necessarios[a] - necessarios[b])[0]!;
  return { necessariosParaConquistar: necessarios, melhorTipo };
}
