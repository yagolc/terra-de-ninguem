import { describe, expect, it } from 'vitest';
import { geradorComSemente } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { protecaoArmazem } from './predios.ts';
import { calcularSaque, capacidadeCarga } from './saque.ts';
import { RECURSOS } from './tipos.ts';
import { exercito, recursos, totalRecursos } from './util.ts';

const MUITA_CARGA = exercito({ cavalaria: 10_000 });

describe('calcularSaque', () => {
  it('leva 30% do que está fora da proteção do armazém', () => {
    const protecao = protecaoArmazem(1);
    const saque = calcularSaque({
      estoque: recursos({ comida: protecao + 1000, madeira: protecao + 500, ouro: protecao }),
      nivelArmazem: 1,
      sobreviventes: MUITA_CARGA,
    });
    expect(saque).toEqual({ comida: 300, madeira: 150, ouro: 0 });
  });

  it('não leva nada de quem só tem estoque protegido', () => {
    const protecao = protecaoArmazem(3);
    const estoque = recursos({ comida: protecao, madeira: protecao - 50, ouro: 0 });
    expect(calcularSaque({ estoque, nivelArmazem: 3, sobreviventes: MUITA_CARGA })).toEqual(recursos());
  });

  it('é limitado pela carga das tropas, reduzindo cada recurso na mesma proporção', () => {
    const tropas = exercito({ lanceiro: 10 }); // carrega 200
    expect(capacidadeCarga(tropas)).toBe(200);
    const saque = calcularSaque({
      estoque: recursos({ comida: 3100, madeira: 1100, ouro: 100 }),
      nivelArmazem: 0,
      sobreviventes: tropas,
    });
    // Alcançável: 900 de comida e 300 de madeira (1200); a carga leva 1/6 de cada.
    expect(saque).toEqual({ comida: 150, madeira: 50, ouro: 0 });
  });

  it('nunca passa de 30% do desprotegido nem da carga (500 casos aleatórios)', () => {
    const gerador = geradorComSemente(7);
    for (let i = 0; i < 500; i++) {
      const nivelArmazem = Math.floor(gerador() * 10);
      const estoque = recursos({ comida: gerador() * 5000, madeira: gerador() * 5000, ouro: gerador() * 2000 });
      const sobreviventes = exercito({ lanceiro: Math.floor(gerador() * 100), cavalaria: Math.floor(gerador() * 50) });
      const saque = calcularSaque({ estoque, nivelArmazem, sobreviventes });

      for (const r of RECURSOS) {
        const desprotegido = Math.max(0, estoque[r] - protecaoArmazem(nivelArmazem));
        expect(saque[r]).toBeGreaterThanOrEqual(0);
        expect(saque[r]).toBeLessThanOrEqual(desprotegido * BALANCEAMENTO.saque.maximoDoDesprotegido);
      }
      expect(totalRecursos(saque)).toBeLessThanOrEqual(capacidadeCarga(sobreviventes));
    }
  });
});
