import { describe, expect, it } from 'vitest';
import { multiplicadorVantagem } from './unidades';

describe('multiplicadorVantagem', () => {
  it('dobra o dano contra o tipo que a unidade vence', () => {
    expect(multiplicadorVantagem('lanceiro', 'cavalaria')).toBe(2);
    expect(multiplicadorVantagem('cavalaria', 'arqueiro')).toBe(2);
    expect(multiplicadorVantagem('arqueiro', 'lanceiro')).toBe(2);
  });

  it('não dá bônus contra o tipo para o qual perde', () => {
    expect(multiplicadorVantagem('lanceiro', 'arqueiro')).toBe(1);
    expect(multiplicadorVantagem('cavalaria', 'lanceiro')).toBe(1);
    expect(multiplicadorVantagem('arqueiro', 'cavalaria')).toBe(1);
  });

  it('não dá bônus contra o mesmo tipo', () => {
    expect(multiplicadorVantagem('lanceiro', 'lanceiro')).toBe(1);
  });
});
