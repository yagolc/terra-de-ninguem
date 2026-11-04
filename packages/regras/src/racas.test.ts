import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { bonusDefesaRaca, efeitosRaca } from './racas.ts';
import { TIPOS_RACA } from './tipos.ts';
import { recursos } from './util.ts';

describe('raças', () => {
  it('sem raça (temporadas antigas), nenhum efeito', () => {
    expect(efeitosRaca(null)).toMatchObject({ producao: recursos(), crescimento: 0, ataque: 0, defesa: 0, velocidade: 0, carga: 0 });
    expect(bonusDefesaRaca(undefined, 'floresta')).toBe(0);
  });

  it('elfo defende melhor na floresta, anão na montanha, orc defende pior em qualquer lugar', () => {
    expect(bonusDefesaRaca('elfo', 'floresta')).toBeCloseTo(0.2);
    expect(bonusDefesaRaca('elfo', 'planicie')).toBe(0);
    expect(bonusDefesaRaca('anao', 'montanha')).toBeCloseTo(0.2);
    expect(bonusDefesaRaca('orc', 'montanha')).toBeCloseTo(-0.1);
  });

  it('produção vira recursos completos (o que não aparece é zero)', () => {
    expect(efeitosRaca('anao').producao).toEqual(recursos({ ouro: 0.15 }));
    expect(efeitosRaca('humano').crescimento).toBeCloseTo(0.2);
    expect(efeitosRaca('humano').producao).toEqual(recursos());
    expect(efeitosRaca('humano').populacaoMaxima).toBeCloseTo(0.1);
    expect(efeitosRaca('orc').populacaoMaxima).toBe(0);
    expect(efeitosRaca('anao').velocidade).toBeCloseTo(-0.15);
  });

  it('nenhum efeito passa de ±20% (estratégia acima de vantagem fixa)', () => {
    for (const raca of TIPOS_RACA) {
      const e = efeitosRaca(raca);
      const valores = [e.crescimento, e.populacaoMaxima, e.ataque, e.defesa, e.velocidade, e.carga, ...Object.values(e.producao), ...Object.values(e.defesaPorTerreno)];
      for (const v of valores) expect(Math.abs(v ?? 0)).toBeLessThanOrEqual(0.2);
    }
    expect(Object.keys(BALANCEAMENTO.racas).sort()).toEqual([...TIPOS_RACA].sort());
  });
});
