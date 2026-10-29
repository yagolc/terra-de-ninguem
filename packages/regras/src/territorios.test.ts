import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { bonusDeTerritorios, distanciasNoGrafo, escolherTerritorioLivre, grafoDeFronteiras } from './territorios.ts';

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
