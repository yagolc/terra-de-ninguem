import { describe, expect, it } from 'vitest';
import { cancelarObra, cancelarTreino } from './cancelamento.ts';
import { custoEvolucao, prediosIniciais, tempoEvolucaoMs } from './predios.ts';
import { custoTreino } from './treino.ts';
import type { Obra } from './tipos.ts';
import { somarRecursos } from './util.ts';

const AGORA = 10_000_000;
const MIN = 60_000;

describe('cancelarObra', () => {
  const predios = { ...prediosIniciais(), centro: 5, casa: 2, fazenda: 1 };
  // Fila: Casa 3 (andando, termina em 10 min), Fazenda 2 (+20), Casa 4 (+30).
  const obras: Obra[] = [
    { tipo: 'casa', prontoEm: AGORA + 10 * MIN },
    { tipo: 'fazenda', prontoEm: AGORA + 30 * MIN },
    { tipo: 'casa', prontoEm: AGORA + 60 * MIN },
  ];

  it('cancelar a última devolve o custo dela e não mexe nas outras', () => {
    const r = cancelarObra({ predios, obras, indice: 2, agora: AGORA });
    expect(r).toEqual({ ok: true, obras: obras.slice(0, 2), canceladas: [{ tipo: 'casa', nivelAlvo: 4 }], devolver: custoEvolucao('casa', 4) });
  });

  it('cancelar a do meio adianta as de depois pelo tempo dela', () => {
    const r = cancelarObra({ predios, obras, indice: 1, agora: AGORA });
    expect(r.ok && r.obras).toEqual([obras[0], { tipo: 'casa', prontoEm: AGORA + 40 * MIN }]);
    expect(r.ok && r.devolver).toEqual(custoEvolucao('fazenda', 2));
  });

  it('cancelar a que está andando leva junto as de depois do mesmo prédio, e a próxima começa agora', () => {
    const r = cancelarObra({ predios, obras, indice: 0, agora: AGORA });
    expect(r.ok && r.obras).toEqual([{ tipo: 'fazenda', prontoEm: AGORA + 20 * MIN }]);
    expect(r.ok && r.canceladas).toEqual([
      { tipo: 'casa', nivelAlvo: 3 },
      { tipo: 'casa', nivelAlvo: 4 },
    ]);
    expect(r.ok && r.devolver).toEqual(somarRecursos(custoEvolucao('casa', 3), custoEvolucao('casa', 4)));
  });

  it('cancelar o Centro leva junto o prédio que só cabia com o Centro novo', () => {
    const p = { ...prediosIniciais(), centro: 3, casa: 3 };
    const fila: Obra[] = [
      { tipo: 'centro', prontoEm: AGORA + tempoEvolucaoMs('centro', 4) },
      { tipo: 'casa', prontoEm: AGORA + tempoEvolucaoMs('centro', 4) + tempoEvolucaoMs('casa', 4) },
    ];
    const r = cancelarObra({ predios: p, obras: fila, indice: 0, agora: AGORA });
    expect(r.ok && r.obras).toEqual([]);
    expect(r.ok && r.devolver).toEqual(somarRecursos(custoEvolucao('centro', 4), custoEvolucao('casa', 4)));
  });

  it('recusa posição fora da fila', () => {
    expect(cancelarObra({ predios, obras, indice: 3, agora: AGORA })).toEqual({ ok: false, motivo: 'item_invalido' });
    expect(cancelarObra({ predios, obras: [], indice: 0, agora: AGORA })).toEqual({ ok: false, motivo: 'item_invalido' });
  });
});

describe('cancelarTreino', () => {
  const fila = [
    { tipo: 'lanceiro' as const, quantidade: 5, prontoEm: AGORA + 5 * MIN },
    { tipo: 'arqueiro' as const, quantidade: 3, prontoEm: AGORA + 9 * MIN },
    { tipo: 'cavalaria' as const, quantidade: 2, prontoEm: AGORA + 15 * MIN },
  ];

  it('devolve o custo do lote e adianta os de depois', () => {
    const r = cancelarTreino({ fila, indice: 1, agora: AGORA });
    expect(r).toEqual({
      ok: true,
      fila: [fila[0], { ...fila[2], prontoEm: AGORA + 11 * MIN }],
      devolver: custoTreino('arqueiro', 3),
    });
  });

  it('cancelar o lote que está andando faz o próximo começar agora', () => {
    const r = cancelarTreino({ fila, indice: 0, agora: AGORA });
    expect(r.ok && r.fila).toEqual([
      { ...fila[1], prontoEm: AGORA + 4 * MIN },
      { ...fila[2], prontoEm: AGORA + 10 * MIN },
    ]);
  });

  it('recusa posição fora da fila', () => {
    expect(cancelarTreino({ fila, indice: -1, agora: AGORA })).toEqual({ ok: false, motivo: 'item_invalido' });
  });
});
