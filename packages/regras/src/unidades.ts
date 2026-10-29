export const TIPOS_UNIDADE = ['lanceiro', 'arqueiro', 'cavalaria'] as const;

export type TipoUnidade = (typeof TIPOS_UNIDADE)[number];

// Triângulo de vantagens do GDD: cada unidade vence exatamente uma outra.
const VENCE: Record<TipoUnidade, TipoUnidade> = {
  lanceiro: 'cavalaria',
  cavalaria: 'arqueiro',
  arqueiro: 'lanceiro',
};

/** Multiplicador de dano do atacante contra o defensor: 2 contra o tipo que vence, 1 nos demais casos. */
export function multiplicadorVantagem(atacante: TipoUnidade, defensor: TipoUnidade): number {
  return VENCE[atacante] === defensor ? 2 : 1;
}
