import { describe, expect, it } from 'vitest';
import { crc16Pix, pixCopiaECola } from './pix.ts';

describe('crc16Pix', () => {
  it('confere com o valor de checagem do CRC-16/CCITT-FALSE', () => {
    expect(crc16Pix('123456789')).toBe('29B1');
  });
});

describe('pixCopiaECola', () => {
  it('monta o exemplo do manual do BR Code (sem valor e sem identificador)', () => {
    expect(pixCopiaECola({ chave: '123e4567-e12b-12d1-a456-426655440000', nome: 'Fulano de Tal', cidade: 'BRASILIA' })).toBe(
      '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***63041D3D',
    );
  });

  it('põe valor e identificador, tira acentos e corta nome e cidade', () => {
    const texto = pixCopiaECola({
      chave: 'chave@exemplo.com',
      nome: 'José da Conceição Albuquerque Neto',
      cidade: 'São José dos Campos',
      valor: 8,
      identificador: 'GEMAS-AB12',
    });
    expect(texto).toContain('54048.00');
    expect(texto).toContain('5925Jose da Conceicao Albuque');
    expect(texto).toContain('6015Sao Jose dos Ca');
    expect(texto).toContain('62130509GEMASAB12');
    expect(texto.slice(-4)).toBe(crc16Pix(texto.slice(0, -4)));
  });
});
