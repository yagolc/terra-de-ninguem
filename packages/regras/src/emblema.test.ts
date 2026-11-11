import { describe, expect, it } from 'vitest';
import { CORES_EMBLEMA, FORMAS_EMBLEMA, LIMITES_EMBLEMA, verificarEmblema, type CamadaEmblema } from './emblema.ts';

const CAMADA: CamadaEmblema = { forma: 'estrela', x: 50, y: 50, escala: 0.6, rotacao: 0, cor: '#d4a64a', espelhar: false };

describe('emblema', () => {
  it('vazio ou ausente vale como sem emblema', () => {
    expect(verificarEmblema(undefined)).toEqual({ ok: true, emblema: [] });
    expect(verificarEmblema(null)).toEqual({ ok: true, emblema: [] });
    expect(verificarEmblema([])).toEqual({ ok: true, emblema: [] });
  });

  it('aceita todas as formas e todas as cores', () => {
    for (const forma of FORMAS_EMBLEMA) expect(verificarEmblema([{ ...CAMADA, forma }]).ok).toBe(true);
    for (const cor of CORES_EMBLEMA) expect(verificarEmblema([{ ...CAMADA, cor }]).ok).toBe(true);
  });

  it('normaliza números, cor e rotação', () => {
    const v = verificarEmblema([{ ...CAMADA, x: 12.345, y: 99.96, escala: 0.12345, rotacao: -90.4, cor: '#D4A64A', espelhar: undefined }]);
    expect(v).toEqual({ ok: true, emblema: [{ ...CAMADA, x: 12.3, y: 100, escala: 0.123, rotacao: 270, cor: '#d4a64a' }] });
    const volta = verificarEmblema([{ ...CAMADA, rotacao: 725 }]);
    expect(volta.ok && volta.emblema[0]!.rotacao).toBe(5);
  });

  it(`aceita até ${LIMITES_EMBLEMA.camadas} camadas`, () => {
    expect(verificarEmblema(Array(LIMITES_EMBLEMA.camadas).fill(CAMADA)).ok).toBe(true);
    expect(verificarEmblema(Array(LIMITES_EMBLEMA.camadas + 1).fill(CAMADA))).toEqual({ ok: false, motivo: 'camadas_demais' });
  });

  it('recusa formas, cores e valores fora dos limites', () => {
    const invalidos: unknown[] = [
      'estrela',
      [null],
      [{ ...CAMADA, forma: 'unicornio' }],
      [{ ...CAMADA, cor: '#123456' }],
      [{ ...CAMADA, x: -1 }],
      [{ ...CAMADA, y: 101 }],
      [{ ...CAMADA, x: '50' }],
      [{ ...CAMADA, x: Number.NaN }],
      [{ ...CAMADA, escala: 0.01 }],
      [{ ...CAMADA, escala: 2 }],
      [{ ...CAMADA, rotacao: Number.POSITIVE_INFINITY }],
      [{ ...CAMADA, espelhar: 'sim' }],
    ];
    for (const valor of invalidos) expect(verificarEmblema(valor)).toEqual({ ok: false, motivo: 'emblema_invalido' });
  });
});
