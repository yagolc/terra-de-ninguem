import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { custoEstrutura, estruturaAtiva, tempoEstruturaMs, verificarEstrutura } from './estruturas.ts';
import { TIPOS_ESTRUTURA } from './tipos.ts';
import { MINUTO_MS } from './util.ts';

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
