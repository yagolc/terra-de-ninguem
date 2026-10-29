import { describe, expect, it } from 'vitest';
import { geradorComSemente, sementeDeTexto } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { distancia, duracaoMarchaMs, velocidadeExercito } from './marcha.ts';
import { HORA_MS, MINUTO_MS, exercito } from './util.ts';

describe('marcha', () => {
  it('calcula a distância em linha reta', () => {
    expect(distancia({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it('o exército anda no passo da unidade mais lenta', () => {
    expect(velocidadeExercito(exercito({ cavalaria: 10 }))).toBe(BALANCEAMENTO.unidades.cavalaria.velocidade);
    expect(velocidadeExercito(exercito({ cavalaria: 10, lanceiro: 1 }))).toBe(BALANCEAMENTO.unidades.lanceiro.velocidade);
    expect(velocidadeExercito(exercito())).toBeNull();
  });

  it('a duração é distância ÷ velocidade', () => {
    const v = BALANCEAMENTO.unidades.lanceiro.velocidade;
    expect(duracaoMarchaMs({ x: 0, y: 0 }, { x: 2 * v, y: 0 }, exercito({ lanceiro: 5 }))).toBe(2 * HORA_MS);
  });

  it('nenhuma marcha dura menos que o mínimo', () => {
    expect(duracaoMarchaMs({ x: 0, y: 0 }, { x: 0.01, y: 0 }, exercito({ cavalaria: 1 }))).toBe(
      BALANCEAMENTO.marcha.duracaoMinimaMin * MINUTO_MS,
    );
  });

  it('recusa marcha sem tropas', () => {
    expect(() => duracaoMarchaMs({ x: 0, y: 0 }, { x: 5, y: 5 }, exercito())).toThrow(RangeError);
  });
});

describe('aleatório com semente', () => {
  it('a mesma semente gera a mesma sequência, sempre em [0, 1)', () => {
    const a = geradorComSemente(123);
    const b = geradorComSemente(123);
    for (let i = 0; i < 100; i++) {
      const valor = a();
      expect(valor).toBe(b());
      expect(valor).toBeGreaterThanOrEqual(0);
      expect(valor).toBeLessThan(1);
    }
  });

  it('textos diferentes geram sementes diferentes', () => {
    expect(sementeDeTexto('marcha-1')).toBe(sementeDeTexto('marcha-1'));
    expect(sementeDeTexto('marcha-1')).not.toBe(sementeDeTexto('marcha-2'));
  });
});
