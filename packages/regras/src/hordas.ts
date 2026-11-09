// Hordas bárbaras: uma por dia, depois da proteção de iniciante, contra um território (ou a cidade) de um dos
// primeiros do placar. Todos a veem chegando. Defender dá ouro; perder custa o saque da cidade ou o território.
import { fimProtecaoIniciante } from './ataques.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { TIPOS_UNIDADE, type Exercito, type Ponto } from './tipos.ts';
import { HORA_MS, exercito } from './util.ts';

/** Quando sai a próxima horda: no fim da proteção de iniciante e depois a cada `intervaloHoras`. */
export function proximaHordaEm(inicioTemporada: number, ultimaPartida: number | null): number {
  return ultimaPartida === null ? fimProtecaoIniciante(inicioTemporada) : ultimaPartida + BALANCEAMENTO.hordas.intervaloHoras * HORA_MS;
}

/** Quando a horda chega ao alvo: `avisoHoras` depois de sair (todos a veem nesse tempo). */
export function chegadaDaHorda(partida: number): number {
  return partida + BALANCEAMENTO.hordas.avisoHoras * HORA_MS;
}

/** Soldados da horda de número `numero` (1 = a primeira), antes da variação. */
export function tamanhoDaHorda(numero: number): number {
  const H = BALANCEAMENTO.hordas;
  return H.unidadesBase + H.unidadesPorHorda * (numero - 1);
}

/**
 * Exército da horda: o tamanho do número dela, com até ±`variacao`, dividido entre os três tipos ao acaso
 * (sempre pelo menos 1 soldado). `aleatorio` vem de uma semente: a mesma horda sai sempre igual.
 */
export function exercitoDaHorda(numero: number, aleatorio: () => number): Exercito {
  const H = BALANCEAMENTO.hordas;
  const total = Math.max(1, Math.round(tamanhoDaHorda(numero) * (1 + (aleatorio() * 2 - 1) * H.variacao)));
  const pesos = TIPOS_UNIDADE.map(() => 0.2 + aleatorio());
  const soma = pesos.reduce((a, b) => a + b, 0);
  const tropas = exercito();
  let restam = total;
  TIPOS_UNIDADE.forEach((tipo, i) => {
    const n = i === TIPOS_UNIDADE.length - 1 ? restam : Math.min(restam, Math.round((total * pesos[i]!) / soma));
    tropas[tipo] = n;
    restam -= n;
  });
  return tropas;
}

/** Ouro para quem derrota a horda de número `numero`. */
export function recompensaDaHorda(numero: number): number {
  const H = BALANCEAMENTO.hordas;
  return H.ouroBase + H.ouroPorHorda * (numero - 1);
}

/**
 * Alvo da horda: um dos `primeirosDoPlacar` (mais pontos; empate, mais territórios, depois o id) e, dele, um
 * território qualquer, a cidade inclusive. Null se ninguém tem território.
 */
export function escolherAlvoDaHorda(entrada: {
  placar: readonly { jogadorId: string; pontos: number; territorios: number }[];
  /** Territórios de cada jogador (ids), a cidade inclusive. */
  territoriosDe: ReadonlyMap<string, readonly string[]>;
  aleatorio: () => number;
}): { jogadorId: string; territorioId: string } | null {
  const candidatos = [...entrada.placar]
    .filter((p) => (entrada.territoriosDe.get(p.jogadorId)?.length ?? 0) > 0)
    .sort((a, b) => b.pontos - a.pontos || b.territorios - a.territorios || a.jogadorId.localeCompare(b.jogadorId))
    .slice(0, BALANCEAMENTO.hordas.primeirosDoPlacar);
  if (candidatos.length === 0) return null;
  const jogador = candidatos[Math.floor(entrada.aleatorio() * candidatos.length)]!;
  const territorios = [...entrada.territoriosDe.get(jogador.jogadorId)!].sort();
  return { jogadorId: jogador.jogadorId, territorioId: territorios[Math.floor(entrada.aleatorio() * territorios.length)]! };
}

/**
 * De onde a horda vem, só para desenhar no mapa: o ponto da borda do mapa mais perto do alvo (os bárbaros
 * chegam das terras de fora).
 */
export function origemDaHorda(alvo: Ponto, mapa: { largura: number; altura: number }): Ponto {
  const distancias = [
    { d: alvo.x, p: { x: 0, y: alvo.y } },
    { d: mapa.largura - alvo.x, p: { x: mapa.largura, y: alvo.y } },
    { d: alvo.y, p: { x: alvo.x, y: 0 } },
    { d: mapa.altura - alvo.y, p: { x: alvo.x, y: mapa.altura } },
  ];
  return distancias.sort((a, b) => a.d - b.d)[0]!.p;
}
