import { describe, expect, it } from 'vitest';
import { geradorComSemente } from './aleatorio.ts';
import {
  ausenteAPartirDe,
  avisoDeAusenciaEm,
  escudoDeRetornoAte,
  guarnicaoRebelde,
  proximaRebeliaoEm,
  territorioQueSeRebela,
} from './ausencia.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { HORA_MS, exercito, totalUnidades } from './util.ts';

const A = BALANCEAMENTO.ausencia;
const VISTO = 1_000 * HORA_MS;

describe('ausência', () => {
  it('fica ausente depois dos dias sem entrar e é avisado antes', () => {
    expect(ausenteAPartirDe(VISTO)).toBe(VISTO + A.diasParaAusente * 24 * HORA_MS);
    expect(avisoDeAusenciaEm(VISTO)).toBe(ausenteAPartirDe(VISTO) - A.avisoHorasAntes * HORA_MS);
    expect(avisoDeAusenciaEm(VISTO)).toBeGreaterThan(VISTO);
    expect(escudoDeRetornoAte(VISTO)).toBe(VISTO + A.escudoRetornoHoras * HORA_MS);
  });

  it('a primeira rebelião vem ao ficar ausente e as outras a cada intervalo', () => {
    const desde = ausenteAPartirDe(VISTO);
    expect(proximaRebeliaoEm(desde, null)).toBe(desde);
    expect(proximaRebeliaoEm(desde, desde)).toBe(desde + A.horasEntreRebelioes * HORA_MS);
    // Rebelião de uma ausência anterior (ele voltou e sumiu de novo) não conta.
    expect(proximaRebeliaoEm(desde, desde - 5 * HORA_MS)).toBe(desde);
  });
});

describe('territorioQueSeRebela', () => {
  // cidade - a - b - c, e d ligado direto na cidade.
  const fronteiras = [
    ['cidade', 'a'],
    ['a', 'b'],
    ['b', 'c'],
    ['cidade', 'd'],
  ] as const;

  it('escolhe o mais longe da cidade', () => {
    expect(territorioQueSeRebela({ cidadeId: 'cidade', territorios: ['cidade', 'a', 'c', 'd'], fronteiras })).toBe('c');
  });

  it('empata pelo id e nunca escolhe a cidade', () => {
    expect(territorioQueSeRebela({ cidadeId: 'cidade', territorios: ['cidade', 'd', 'a'], fronteiras })).toBe('a');
    expect(territorioQueSeRebela({ cidadeId: 'cidade', territorios: ['cidade'], fronteiras })).toBeNull();
  });

  it('território sem caminho até a cidade vai primeiro', () => {
    expect(territorioQueSeRebela({ cidadeId: 'cidade', territorios: ['cidade', 'c', 'ilha'], fronteiras })).toBe('ilha');
  });
});

describe('guarnicaoRebelde', () => {
  it('completa até a fração do exército médio dos ativos, na composição', () => {
    const g = guarnicaoRebelde({ deixadas: exercito({ lanceiro: 10 }), soldadosDosAtivos: [300, 200, 100] });
    expect(totalUnidades(g)).toBe(Math.round(200 * A.fracaoExercitoMedio));
    expect(g.lanceiro).toBeGreaterThanOrEqual(10);
    expect(g.arqueiro).toBeGreaterThan(0);
    expect(g.cavalaria).toBeGreaterThan(0);
  });

  it('mantém as tropas deixadas quando já passam do alvo', () => {
    const deixadas = exercito({ lanceiro: 200, arqueiro: 50 });
    expect(guarnicaoRebelde({ deixadas, soldadosDosAtivos: [100] })).toEqual(deixadas);
  });

  it('nunca fica abaixo do mínimo, mesmo sem jogadores ativos', () => {
    expect(totalUnidades(guarnicaoRebelde({ deixadas: exercito(), soldadosDosAtivos: [] }))).toBe(A.guarnicaoMinima);
    expect(totalUnidades(guarnicaoRebelde({ deixadas: exercito(), soldadosDosAtivos: [0, 5] }))).toBe(A.guarnicaoMinima);
  });

  it('em centenas de casos, nunca perde tropas deixadas e soma exatamente o alvo', () => {
    const aleatorio = geradorComSemente(42);
    for (let i = 0; i < 500; i++) {
      const deixadas = exercito({
        lanceiro: Math.floor(aleatorio() * 60),
        arqueiro: Math.floor(aleatorio() * 60),
        cavalaria: Math.floor(aleatorio() * 60),
      });
      const soldadosDosAtivos = Array.from({ length: 1 + Math.floor(aleatorio() * 7) }, () => Math.floor(aleatorio() * 900));
      const g = guarnicaoRebelde({ deixadas, soldadosDosAtivos });
      const ativos = soldadosDosAtivos.filter((s) => s > 0);
      const media = ativos.length ? ativos.reduce((a, b) => a + b, 0) / ativos.length : 0;
      const alvo = Math.max(A.guarnicaoMinima, Math.round(media * A.fracaoExercitoMedio));
      expect(totalUnidades(g)).toBe(Math.max(alvo, totalUnidades(deixadas)));
      for (const tipo of ['lanceiro', 'arqueiro', 'cavalaria'] as const) {
        expect(g[tipo]).toBeGreaterThanOrEqual(deixadas[tipo]);
        expect(Number.isInteger(g[tipo])).toBe(true);
      }
    }
  });
});
