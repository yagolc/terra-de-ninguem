import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { cidadeInicial } from './producao.ts';
import { custoTreino, tempoTreinoMs, verificarTreino } from './treino.ts';
import type { EstadoCidade } from './tipos.ts';

function cidadeComQuartel(mudancas: Partial<EstadoCidade> = {}): EstadoCidade {
  const inicial = cidadeInicial(0);
  return {
    ...inicial,
    populacao: 20,
    predios: { ...inicial.predios, centro: 2, quartel: 1 },
    trabalhadores: { comida: 5, madeira: 5, ouro: 0 },
    recursos: { comida: 1000, madeira: 1000, ouro: 1000 },
    ...mudancas,
  };
}

describe('custo e tempo de treino', () => {
  it('multiplica o custo da unidade pela quantidade', () => {
    expect(custoTreino('cavalaria', 3)).toEqual({ comida: 180, madeira: 60, ouro: 75 });
  });

  it('quartéis mais altos treinam mais rápido, até a redução máxima', () => {
    const base = tempoTreinoMs('lanceiro', 10, 1);
    expect(base).toBe(BALANCEAMENTO.unidades.lanceiro.tempoTreinoSeg * 10 * 1000);
    expect(tempoTreinoMs('lanceiro', 10, 5)).toBeLessThan(base);
    expect(tempoTreinoMs('lanceiro', 10, 100)).toBe(base * (1 - BALANCEAMENTO.treino.reducaoMaxima));
  });
});

describe('verificarTreino', () => {
  it('aceita um lote possível e devolve custo e tempo', () => {
    const r = verificarTreino({ cidade: cidadeComQuartel(), tipo: 'lanceiro', quantidade: 5, soldados: 0 });
    expect(r).toEqual({ ok: true, custo: custoTreino('lanceiro', 5), tempoMs: tempoTreinoMs('lanceiro', 5, 1) });
  });

  it('exige quartel', () => {
    const cidade = cidadeComQuartel();
    cidade.predios.quartel = 0;
    expect(verificarTreino({ cidade, tipo: 'lanceiro', quantidade: 1, soldados: 0 })).toEqual({
      ok: false,
      motivo: 'sem_quartel',
    });
  });

  it('cada habitante é trabalhador ou soldado: precisa de habitantes livres', () => {
    // 20 de população − 10 trabalhadores − 6 soldados = 4 livres
    const cidade = cidadeComQuartel();
    expect(verificarTreino({ cidade, tipo: 'arqueiro', quantidade: 4, soldados: 6 }).ok).toBe(true);
    expect(verificarTreino({ cidade, tipo: 'arqueiro', quantidade: 5, soldados: 6 })).toEqual({
      ok: false,
      motivo: 'populacao_insuficiente',
    });
  });

  it('exige recursos', () => {
    const cidade = cidadeComQuartel({ recursos: { comida: 1000, madeira: 1000, ouro: 0 } });
    expect(verificarTreino({ cidade, tipo: 'cavalaria', quantidade: 1, soldados: 0 })).toEqual({
      ok: false,
      motivo: 'recursos_insuficientes',
    });
  });

  it('recusa quantidade zero, negativa ou fracionária', () => {
    for (const quantidade of [0, -3, 1.5]) {
      expect(verificarTreino({ cidade: cidadeComQuartel(), tipo: 'lanceiro', quantidade, soldados: 0 }).ok).toBe(false);
    }
  });
});
