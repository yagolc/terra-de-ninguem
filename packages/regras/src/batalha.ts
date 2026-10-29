import { BALANCEAMENTO } from './balanceamento.ts';
import { TIPOS_UNIDADE, type Exercito, type Terreno, type TipoUnidade } from './tipos.ts';
import { multiplicadorVantagem } from './unidades.ts';
import { mapearExercito, totalUnidades } from './util.ts';

/** Vantagem média de uma unidade contra a composição do exército inimigo (1 = neutra, 2 = só alvos que ela vence). */
function vantagemContra(tipo: TipoUnidade, inimigo: Exercito): number {
  const total = totalUnidades(inimigo);
  if (total === 0) return 1;
  return TIPOS_UNIDADE.reduce((soma, alvo) => soma + (inimigo[alvo] / total) * multiplicadorVantagem(tipo, alvo), 0);
}

/** Força de ataque bruta, já com o triângulo de vantagens e antes da sorte. */
export function forcaAtaque(atacante: Exercito, defensor: Exercito): number {
  return TIPOS_UNIDADE.reduce(
    (soma, tipo) => soma + atacante[tipo] * BALANCEAMENTO.unidades[tipo].ataque * vantagemContra(tipo, defensor),
    0,
  );
}

/** Força de defesa com triângulo de vantagens, terreno e muralha. */
export function forcaDefesa(defensor: Exercito, atacante: Exercito, terreno: Terreno, nivelMuralha: number): number {
  const { bonusFlorestaArqueiro, bonusMontanha, bonusMuralhaPorNivel } = BALANCEAMENTO.batalha;
  const bonusGeral = (terreno === 'montanha' ? 1 + bonusMontanha : 1) * (1 + bonusMuralhaPorNivel * nivelMuralha);

  return TIPOS_UNIDADE.reduce((soma, tipo) => {
    const bonusTipo = terreno === 'floresta' && tipo === 'arqueiro' ? 1 + bonusFlorestaArqueiro : 1;
    return soma + defensor[tipo] * BALANCEAMENTO.unidades[tipo].defesa * vantagemContra(tipo, atacante) * bonusTipo;
  }, 0) * bonusGeral;
}

export type EntradaBatalha = {
  atacante: Exercito;
  defensor: Exercito;
  terreno: Terreno;
  /** Nível da muralha; 0 fora do território da cidade. */
  nivelMuralha: number;
  /** Sorte em [-1, 1] (use `sortearSorte`); vira ±`sorteMaxima` na força do atacante. */
  sorte: number;
  /** A cidade principal pode ser saqueada, mas nunca conquistada. */
  alvoCidadePrincipal: boolean;
};

export type ResultadoBatalha = {
  vencedor: 'atacante' | 'defensor';
  forcaAtaque: number;
  forcaDefesa: number;
  /** forcaAtaque / forcaDefesa (Infinity se não havia defensores). */
  margem: number;
  perdasAtacante: Exercito;
  perdasDefensor: Exercito;
  sobreviventesAtacante: Exercito;
  sobreviventesDefensor: Exercito;
  /** O atacante venceu com folga suficiente e o alvo não é a cidade principal. */
  permiteConquista: boolean;
};

function aplicarPerdas(tropas: Exercito, fracao: number): Exercito {
  return mapearExercito((tipo) => Math.min(tropas[tipo], Math.round(tropas[tipo] * fracao)));
}

/**
 * Resolve uma batalha (GDD, "Resolução da batalha"):
 * 1. força de cada lado com o triângulo de vantagens;
 * 2. muralha, terreno e sorte de no máximo ±10%;
 * 3. o perdedor perde `perdaPerdedor` do exército e o vencedor perde (força menor / força maior)^expoente;
 * 4. conquista só com margem mínima. Em empate, vence o defensor.
 */
export function resolverBatalha(entrada: EntradaBatalha): ResultadoBatalha {
  const { atacante, defensor, terreno, nivelMuralha, alvoCidadePrincipal } = entrada;
  const { sorteMaxima, expoentePerdasVencedor, perdaPerdedor, margemConquista } = BALANCEAMENTO.batalha;

  const sorte = Math.max(-1, Math.min(1, entrada.sorte));
  const ataque = forcaAtaque(atacante, defensor) * (1 + sorteMaxima * sorte);
  const defesa = forcaDefesa(defensor, atacante, terreno, nivelMuralha);

  const atacanteVence = ataque > defesa;
  const maior = Math.max(ataque, defesa);
  const razao = maior > 0 ? Math.min(ataque, defesa) / maior : 0;
  const fracaoVencedor = razao ** expoentePerdasVencedor;

  const perdasAtacante = aplicarPerdas(atacante, atacanteVence ? fracaoVencedor : perdaPerdedor);
  const perdasDefensor = aplicarPerdas(defensor, atacanteVence ? perdaPerdedor : fracaoVencedor);
  const margem = defesa > 0 ? ataque / defesa : Number.POSITIVE_INFINITY;

  return {
    vencedor: atacanteVence ? 'atacante' : 'defensor',
    forcaAtaque: ataque,
    forcaDefesa: defesa,
    margem,
    perdasAtacante,
    perdasDefensor,
    sobreviventesAtacante: mapearExercito((tipo) => atacante[tipo] - perdasAtacante[tipo]),
    sobreviventesDefensor: mapearExercito((tipo) => defensor[tipo] - perdasDefensor[tipo]),
    permiteConquista: atacanteVence && margem >= margemConquista && !alvoCidadePrincipal,
  };
}
