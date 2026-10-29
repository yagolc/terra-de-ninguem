import { describe, expect, it } from 'vitest';
import { geradorComSemente } from './aleatorio.ts';
import { TIPOS_UNIDADE } from './tipos.ts';
import { distribuirPerdas, exercito, somarExercitos, totalUnidades } from './util.ts';

describe('distribuirPerdas', () => {
  it('divide na proporção de cada grupo', () => {
    const grupos = [exercito({ lanceiro: 30 }), exercito({ lanceiro: 10 })];
    expect(distribuirPerdas(grupos, exercito({ lanceiro: 8 }))).toEqual([exercito({ lanceiro: 6 }), exercito({ lanceiro: 2 })]);
  });

  it('nunca tira mais do que o grupo tem, mesmo pedindo demais', () => {
    const grupos = [exercito({ arqueiro: 3 }), exercito({ arqueiro: 1 })];
    expect(distribuirPerdas(grupos, exercito({ arqueiro: 50 }))).toEqual(grupos);
  });

  it('fecha a conta exata em inteiros (500 casos aleatórios)', () => {
    const gerador = geradorComSemente(3);
    for (let i = 0; i < 500; i++) {
      const grupos = Array.from({ length: 1 + Math.floor(gerador() * 4) }, () =>
        exercito({
          lanceiro: Math.floor(gerador() * 40),
          arqueiro: Math.floor(gerador() * 40),
          cavalaria: Math.floor(gerador() * 20),
        }),
      );
      const total = somarExercitos(...grupos);
      const perdas = exercito({
        lanceiro: Math.floor(gerador() * total.lanceiro),
        arqueiro: Math.floor(gerador() * total.arqueiro),
        cavalaria: Math.floor(gerador() * total.cavalaria),
      });
      const resultado = distribuirPerdas(grupos, perdas);
      expect(somarExercitos(...resultado)).toEqual(perdas);
      resultado.forEach((r, g) => {
        for (const tipo of TIPOS_UNIDADE) {
          expect(r[tipo]).toBeGreaterThanOrEqual(0);
          expect(r[tipo]).toBeLessThanOrEqual(grupos[g]![tipo]);
        }
      });
    }
  });

  it('soma exércitos', () => {
    expect(totalUnidades(somarExercitos(exercito({ lanceiro: 2 }), exercito({ lanceiro: 1, cavalaria: 4 })))).toBe(7);
  });
});
