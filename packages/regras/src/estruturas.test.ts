import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  custoEstrada,
  custoEstrutura,
  estradaPronta,
  estruturaAtiva,
  multiplicadorEstrada,
  tempoEstradaMs,
  tempoEstruturaMs,
  verificarEstrada,
  verificarEstrutura,
} from './estruturas.ts';
import { duracaoMarchaMs } from './marcha.ts';
import { TIPOS_ESTRUTURA } from './tipos.ts';
import { MINUTO_MS, exercito } from './util.ts';

const AGORA = 1_000_000;
const RICO = { comida: 1000, madeira: 0, ouro: 1000 };

describe('verificarEstrutura', () => {
  it('constrói em território próprio sem estrutura, cobrando o custo e marcando o fim da obra', () => {
    for (const tipo of TIPOS_ESTRUTURA) {
      const r = verificarEstrutura({ tipo, territorioDoJogador: true, jaTemEstrutura: false, recursos: RICO, agora: AGORA });
      expect(r).toEqual({ ok: true, custo: custoEstrutura(tipo), prontoEm: AGORA + BALANCEAMENTO.estruturas[tipo].tempoMin * MINUTO_MS });
    }
  });

  it('as estruturas custam só comida e ouro', () => {
    for (const tipo of TIPOS_ESTRUTURA) expect(custoEstrutura(tipo).madeira).toBe(0);
  });

  it('recusa território alheio, território que já tem estrutura e falta de recursos', () => {
    const base = { tipo: 'torre' as const, territorioDoJogador: true, jaTemEstrutura: false, recursos: RICO, agora: AGORA };
    expect(verificarEstrutura({ ...base, territorioDoJogador: false })).toEqual({ ok: false, motivo: 'territorio_invalido' });
    expect(verificarEstrutura({ ...base, jaTemEstrutura: true })).toEqual({ ok: false, motivo: 'ja_tem_estrutura' });
    const custo = custoEstrutura('torre');
    const quase = { comida: custo.comida, madeira: 0, ouro: custo.ouro - 1 };
    expect(verificarEstrutura({ ...base, recursos: quase })).toEqual({ ok: false, motivo: 'recursos_insuficientes' });
  });
});

describe('estruturaAtiva', () => {
  it('só vale depois de pronta e para o tipo certo', () => {
    const torre = { tipo: 'torre' as const, prontoEm: AGORA + tempoEstruturaMs('torre') };
    expect(estruturaAtiva(torre, 'torre', AGORA)).toBe(false);
    expect(estruturaAtiva(torre, 'torre', torre.prontoEm)).toBe(true);
    expect(estruturaAtiva(torre, 'palicada', torre.prontoEm)).toBe(false);
    expect(estruturaAtiva(null, 'torre', AGORA)).toBe(false);
    // Estrutura secreta de outro jogador: o tipo não se sabe.
    expect(estruturaAtiva({ tipo: null, prontoEm: null }, 'torre', AGORA)).toBe(false);
  });
});

describe('estrada', () => {
  const RICO_MADEIRA = { comida: 0, madeira: 1000, ouro: 1000 };

  it('faz em território próprio sem estrada, cobrando madeira e ouro e marcando o fim da obra', () => {
    expect(verificarEstrada({ territorioDoJogador: true, jaTemEstrada: false, recursos: RICO_MADEIRA, agora: AGORA })).toEqual({
      ok: true,
      custo: custoEstrada(),
      prontoEm: AGORA + tempoEstradaMs(),
    });
    expect(custoEstrada().madeira).toBeGreaterThan(0);
  });

  it('recusa território alheio, estrada repetida e falta de recursos', () => {
    const base = { territorioDoJogador: true, jaTemEstrada: false, recursos: RICO_MADEIRA, agora: AGORA };
    expect(verificarEstrada({ ...base, territorioDoJogador: false })).toEqual({ ok: false, motivo: 'territorio_invalido' });
    expect(verificarEstrada({ ...base, jaTemEstrada: true })).toEqual({ ok: false, motivo: 'ja_tem_estrada' });
    expect(verificarEstrada({ ...base, recursos: { comida: 0, madeira: 10, ouro: 1000 } })).toEqual({ ok: false, motivo: 'recursos_insuficientes' });
  });

  it('só vale pronta e com estrada nas duas pontas', () => {
    expect(estradaPronta({ prontoEm: AGORA + 1 }, AGORA)).toBe(false);
    expect(estradaPronta({ prontoEm: AGORA }, AGORA)).toBe(true);
    expect(estradaPronta(null, AGORA)).toBe(false);
    expect(multiplicadorEstrada(true, true)).toBe(BALANCEAMENTO.estrada.multiplicadorVelocidade);
    expect(multiplicadorEstrada(true, false)).toBe(1);
    expect(multiplicadorEstrada(false, true)).toBe(1);
  });

  it('pela estrada o movimento leva metade do tempo (respeitando o mínimo da marcha)', () => {
    const tropas = exercito({ lanceiro: 10 });
    const [a, b] = [{ x: 0, y: 0 }, { x: 20, y: 0 }];
    const normal = duracaoMarchaMs(a, b, tropas);
    expect(duracaoMarchaMs(a, b, tropas, 0, multiplicadorEstrada(true, true))).toBe(normal / 2);
    const perto = { x: 2, y: 0 };
    expect(duracaoMarchaMs(a, perto, tropas, 0, 2)).toBe(BALANCEAMENTO.marcha.duracaoMinimaMin * MINUTO_MS);
  });
});
