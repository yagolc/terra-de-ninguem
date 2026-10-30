import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  CORES_JOGADORES,
  bonusDeTerritorios,
  distanciasNoGrafo,
  escolherCor,
  escolherTerritorioLivre,
  grafoDeFronteiras,
  ligadosPorTerritoriosProprios,
} from './territorios.ts';

// Uma linha de territórios: a - b - c - d - e
const LINHA = grafoDeFronteiras([
  ['a', 'b'],
  ['b', 'c'],
  ['c', 'd'],
  ['d', 'e'],
] as const);

describe('grafo de territórios', () => {
  it('mede a distância em fronteiras', () => {
    const d = distanciasNoGrafo(LINHA, ['a']);
    expect(d.get('a')).toBe(0);
    expect(d.get('e')).toBe(4);
  });

  it('dá ao jogador atrasado o território livre mais distante dos ocupados', () => {
    const escolhido = escolherTerritorioLivre({
      todos: ['a', 'b', 'c', 'd', 'e'],
      grafo: LINHA,
      ocupadosOuReservados: new Set(['a', 'b']),
    });
    expect(escolhido).toBe('e');
  });

  it('não escolhe nada se todos estão ocupados', () => {
    expect(escolherTerritorioLivre({ todos: ['a'], grafo: LINHA, ocupadosOuReservados: new Set(['a']) })).toBeNull();
  });

  it('soma o bônus de cada território do jogador', () => {
    const b = BALANCEAMENTO.mapa.bonusTerritorio;
    expect(bonusDeTerritorios(['comida', 'comida', 'ouro'])).toEqual({ comida: 2 * b, madeira: 0, ouro: b });
  });
});

describe('ligadosPorTerritoriosProprios', () => {
  it('liga dois territórios próprios por um caminho só de territórios próprios', () => {
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'c', proprios: new Set(['a', 'b', 'c']) })).toBe(true);
  });

  it('não atravessa território alheio', () => {
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'c', proprios: new Set(['a', 'c']) })).toBe(false);
  });

  it('origem ou destino alheio não está ligado', () => {
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'b', proprios: new Set(['a']) })).toBe(false);
  });
});

describe('escolherCor', () => {
  it('dá a primeira cor livre e nunca repete enquanto houver cor livre', () => {
    expect(escolherCor([])).toBe(CORES_JOGADORES[0]);
    const usadas: string[] = [];
    for (let i = 0; i < CORES_JOGADORES.length; i++) usadas.push(escolherCor(usadas));
    expect(new Set(usadas).size).toBe(CORES_JOGADORES.length);
  });

  it('ignora jogadores sem cor e diferença de maiúsculas', () => {
    expect(escolherCor([null, CORES_JOGADORES[0].toUpperCase()])).toBe(CORES_JOGADORES[1]);
  });
});
