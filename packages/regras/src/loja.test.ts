import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { gastoTerminarObra, obraAceleravel, pacoteValido, precoTerminarObra, terminarObraAgora } from './loja.ts';
import { prediosIniciais } from './predios.ts';
import type { Obra } from './tipos.ts';

const AGORA = 10_000_000;
const MIN = 60_000;

describe('precoTerminarObra', () => {
  it('começa no preço base e dobra a cada uso', () => {
    const base = BALANCEAMENTO.loja.terminarObra.precoBase;
    expect([0, 1, 2, 3, 4].map(precoTerminarObra)).toEqual([base, base * 2, base * 4, base * 8, base * 16]);
  });

  it('o gasto total dos primeiros usos é base × (2^n − 1)', () => {
    const base = BALANCEAMENTO.loja.terminarObra.precoBase;
    for (let n = 0; n <= 10; n++) expect(gastoTerminarObra(n)).toBe(base * (2 ** n - 1));
  });
});

describe('obraAceleravel', () => {
  it('vale até o nível máximo da loja e nunca na Muralha', () => {
    const max = BALANCEAMENTO.loja.terminarObra.nivelMaximo;
    expect(obraAceleravel('casa', 1)).toBe(true);
    expect(obraAceleravel('casa', max)).toBe(true);
    expect(obraAceleravel('casa', max + 1)).toBe(false);
    expect(obraAceleravel('muralha', 1)).toBe(false);
  });
});

describe('pacoteValido', () => {
  it('aceita só os pacotes à venda', () => {
    expect(pacoteValido(BALANCEAMENTO.loja.pacotes[0])).toBe(true);
    expect(pacoteValido(3)).toBe(false);
    expect(pacoteValido('2')).toBe(false);
  });
});

describe('terminarObraAgora', () => {
  const predios = { ...prediosIniciais(), centro: 5, casa: 2, fazenda: 1 };
  // Casa 3 andando (termina em 10 min), Fazenda 2 (+20 min), Casa 4 (+30 min).
  const obras: Obra[] = [
    { tipo: 'casa', prontoEm: AGORA + 10 * MIN },
    { tipo: 'fazenda', prontoEm: AGORA + 30 * MIN },
    { tipo: 'casa', prontoEm: AGORA + 60 * MIN },
  ];
  const base = { predios, obras, prontoEm: AGORA + 10 * MIN, gemas: 100, usos: 0, agora: AGORA };

  it('termina a primeira, cobra o preço e a próxima começa agora com a mesma duração', () => {
    const r = terminarObraAgora(base);
    expect(r).toEqual({
      ok: true,
      tipo: 'casa',
      nivelAlvo: 3,
      preco: precoTerminarObra(0),
      obras: [
        { tipo: 'fazenda', prontoEm: AGORA + 20 * MIN },
        { tipo: 'casa', prontoEm: AGORA + 50 * MIN },
      ],
    });
  });

  it('o preço segue os usos da temporada', () => {
    const r = terminarObraAgora({ ...base, usos: 3 });
    expect(r.ok && r.preco).toBe(precoTerminarObra(3));
  });

  it('recusa sem obra, com outra obra que não a andando, ou sem gemas', () => {
    expect(terminarObraAgora({ ...base, obras: [] })).toEqual({ ok: false, motivo: 'sem_obra' });
    expect(terminarObraAgora({ ...base, prontoEm: AGORA + 30 * MIN })).toEqual({ ok: false, motivo: 'item_invalido' });
    expect(terminarObraAgora({ ...base, gemas: precoTerminarObra(0) - 1 })).toEqual({ ok: false, motivo: 'gemas_insuficientes' });
    expect(terminarObraAgora({ ...base, gemas: 1000, usos: 2, prontoEm: AGORA + 10 * MIN }).ok).toBe(true);
  });

  it('recusa a Muralha e níveis acima do máximo da loja', () => {
    const muralha: Obra[] = [{ tipo: 'muralha', prontoEm: AGORA + MIN }];
    expect(terminarObraAgora({ ...base, obras: muralha, prontoEm: AGORA + MIN })).toEqual({ ok: false, motivo: 'predio_proibido' });
    const max = BALANCEAMENTO.loja.terminarObra.nivelMaximo;
    const alta = { ...predios, centro: 10, casa: max };
    const obraAlta: Obra[] = [{ tipo: 'casa', prontoEm: AGORA + MIN }];
    expect(terminarObraAgora({ ...base, predios: alta, obras: obraAlta, prontoEm: AGORA + MIN })).toEqual({ ok: false, motivo: 'nivel_alto' });
    const noLimite = { ...alta, casa: max - 1 };
    expect(terminarObraAgora({ ...base, predios: noLimite, obras: obraAlta, prontoEm: AGORA + MIN }).ok).toBe(true);
  });
});
