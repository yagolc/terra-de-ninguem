// Raças: escolhidas ao fundar a cidade, valem a temporada toda. Cada uma tem vantagem e desvantagem (GDD: "Raças").
import { BALANCEAMENTO } from './balanceamento.ts';
import type { Raca, Recursos, Terreno } from './tipos.ts';
import { recursos } from './util.ts';

type EfeitosRaca = {
  /** Soma ao bônus de produção de cada recurso (0,1 = +10%). */
  producao: Recursos;
  crescimento: number;
  populacaoMaxima: number;
  ataque: number;
  /** Defesa em qualquer território do jogador. */
  defesa: number;
  /** Defesa a mais em territórios desse terreno. */
  defesaPorTerreno: Partial<Record<Terreno, number>>;
  velocidade: number;
  carga: number;
};

const NENHUM: EfeitosRaca = {
  producao: recursos(),
  crescimento: 0,
  populacaoMaxima: 0,
  ataque: 0,
  defesa: 0,
  defesaPorTerreno: {},
  velocidade: 0,
  carga: 0,
};

/** Efeitos da raça; cidades sem raça (temporadas antigas) não têm nenhum. */
export function efeitosRaca(raca: Raca | null | undefined): EfeitosRaca {
  if (!raca) return NENHUM;
  const config: Partial<Omit<EfeitosRaca, 'producao'>> & { producao?: Partial<Recursos> } = BALANCEAMENTO.racas[raca];
  return { ...NENHUM, ...config, producao: recursos(config.producao) };
}

/** Bônus (ou penalidade) de defesa da raça de quem defende, no terreno da batalha. */
export function bonusDefesaRaca(raca: Raca | null | undefined, terreno: Terreno): number {
  const efeitos = efeitosRaca(raca);
  return efeitos.defesa + (efeitos.defesaPorTerreno[terreno] ?? 0);
}
