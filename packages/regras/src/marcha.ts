import { BALANCEAMENTO } from './balanceamento.ts';
import { TIPOS_UNIDADE, type Exercito, type Ponto } from './tipos.ts';
import { HORA_MS, MINUTO_MS } from './util.ts';

/** Distância em léguas entre dois pontos do mapa. */
export function distancia(a: Ponto, b: Ponto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** O exército anda no passo da unidade mais lenta. `null` se não há tropas. */
export function velocidadeExercito(tropas: Exercito): number | null {
  const velocidades = TIPOS_UNIDADE.filter((tipo) => tropas[tipo] > 0).map((tipo) => BALANCEAMENTO.unidades[tipo].velocidade);
  return velocidades.length > 0 ? Math.min(...velocidades) : null;
}

/** Duração da marcha em ms (arredondada ao segundo), com um mínimo para todo ataque dar tempo de reação. */
export function duracaoMarchaMs(origem: Ponto, destino: Ponto, tropas: Exercito): number {
  const velocidade = velocidadeExercito(tropas);
  if (velocidade === null) throw new RangeError('Uma marcha precisa de pelo menos uma unidade.');

  const ms = Math.max((distancia(origem, destino) / velocidade) * HORA_MS, BALANCEAMENTO.marcha.duracaoMinimaMin * MINUTO_MS);
  return Math.round(ms / 1000) * 1000;
}
