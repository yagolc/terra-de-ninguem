import { describe, expect, it } from 'vitest';
import { geradorComSemente } from './aleatorio.ts';
import { fimProtecaoIniciante } from './ataques.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  chegadaDaHorda,
  escolherAlvoDaHorda,
  exercitoDaHorda,
  origemDaHorda,
  proximaHordaEm,
  recompensaDaHorda,
  tamanhoDaHorda,
} from './hordas.ts';
import { HORA_MS, totalUnidades } from './util.ts';

const H = BALANCEAMENTO.hordas;

describe('hordas bárbaras', () => {
  it('a primeira sai no fim da proteção de iniciante, as outras a cada intervalo, e chegam depois do aviso', () => {
    const inicio = 1_000_000;
    expect(proximaHordaEm(inicio, null)).toBe(fimProtecaoIniciante(inicio));
    expect(proximaHordaEm(inicio, 5_000_000)).toBe(5_000_000 + H.intervaloHoras * HORA_MS);
    expect(chegadaDaHorda(5_000_000)).toBe(5_000_000 + H.avisoHoras * HORA_MS);
  });

  it('começa pequena e cresce; a recompensa também', () => {
    expect(tamanhoDaHorda(1)).toBe(H.unidadesBase);
    expect(tamanhoDaHorda(10)).toBeGreaterThan(tamanhoDaHorda(2));
    expect(recompensaDaHorda(1)).toBe(H.ouroBase);
    expect(recompensaDaHorda(10)).toBeGreaterThan(recompensaDaHorda(2));
  });

  it('o exército fica dentro da variação, nunca vazio, e a mesma semente dá a mesma horda', () => {
    for (let numero = 1; numero <= 21; numero++) {
      for (let s = 1; s <= 30; s++) {
        const tropas = exercitoDaHorda(numero, geradorComSemente(s * 7 + numero));
        const total = totalUnidades(tropas);
        expect(total).toBeGreaterThanOrEqual(Math.max(1, Math.round(tamanhoDaHorda(numero) * (1 - H.variacao))));
        expect(total).toBeLessThanOrEqual(Math.round(tamanhoDaHorda(numero) * (1 + H.variacao)));
        for (const n of Object.values(tropas)) expect(n).toBeGreaterThanOrEqual(0);
      }
    }
    expect(exercitoDaHorda(4, geradorComSemente(9))).toEqual(exercitoDaHorda(4, geradorComSemente(9)));
  });

  it('o alvo é sempre um dos primeiros do placar que têm território, a cidade inclusive', () => {
    const placar = [
      { jogadorId: 'a', pontos: 300, territorios: 6 },
      { jogadorId: 'b', pontos: 250, territorios: 5 },
      { jogadorId: 'c', pontos: 200, territorios: 4 },
      { jogadorId: 'd', pontos: 400, territorios: 0 },
      { jogadorId: 'e', pontos: 100, territorios: 2 },
    ];
    const territoriosDe = new Map([
      ['a', ['a1', 'a2']],
      ['b', ['b1']],
      ['c', ['c1', 'c2', 'c3']],
      ['d', []],
      ['e', ['e1']],
    ]);
    const vistos = new Set<string>();
    for (let s = 1; s <= 300; s++) {
      const alvo = escolherAlvoDaHorda({ placar, territoriosDe, aleatorio: geradorComSemente(s) })!;
      expect(['a', 'b', 'c']).toContain(alvo.jogadorId);
      expect(territoriosDe.get(alvo.jogadorId)).toContain(alvo.territorioId);
      vistos.add(alvo.territorioId);
    }
    expect(vistos.size).toBe(6);
    expect(escolherAlvoDaHorda({ placar: [], territoriosDe, aleatorio: geradorComSemente(1) })).toBeNull();
  });

  it('vem da borda do mapa mais perto do alvo', () => {
    const mapa = { largura: 60, altura: 40 };
    expect(origemDaHorda({ x: 5, y: 20 }, mapa)).toEqual({ x: 0, y: 20 });
    expect(origemDaHorda({ x: 30, y: 37 }, mapa)).toEqual({ x: 30, y: 40 });
  });
});
