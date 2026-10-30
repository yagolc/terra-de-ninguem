import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  avaliarObjetivo,
  fimDaTemporada,
  objetivoMetadeDoMapa,
  pontuar,
  sortearObjetivo,
  vencedorPorPontos,
  type Objetivo,
  type SituacaoJogador,
} from './objetivos.ts';
import { HORA_MS } from './util.ts';

const REGIOES = [
  { id: 'r1', territorios: 6 },
  { id: 'r2', territorios: 5 },
  { id: 'r3', territorios: 5 },
  { id: 'r4', territorios: 4 },
  { id: 'r5', territorios: 5 },
  { id: 'r6', territorios: 5 },
];
const TOTAL = 30;

function situacao(mudancas: Partial<SituacaoJogador> = {}): SituacaoJogador {
  return {
    meusTerritorios: [],
    territoriosPorRegiao: new Map(REGIOES.map((r) => [r.id, r.territorios])),
    totalTerritorios: TOTAL,
    populacao: 10,
    ...mudancas,
  };
}

describe('sortearObjetivo', () => {
  it('a mesma semente sorteia o mesmo objetivo', () => {
    const entrada = { semente: 42, regioes: REGIOES, totalTerritorios: TOTAL, rivais: ['b'], jaSorteados: [] };
    expect(sortearObjetivo(entrada)).toEqual(sortearObjetivo(entrada));
  });

  it('sorteia objetivos válidos e variados (300 sorteios)', () => {
    const vistos = new Set<string>();
    for (let s = 1; s <= 300; s++) {
      const o = sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, rivais: ['b', 'c'], jaSorteados: [] });
      vistos.add(o.tipo);
      if (o.tipo === 'duas_regioes') {
        const soma = o.regioes.reduce((t, id) => t + REGIOES.find((r) => r.id === id)!.territorios, 0);
        expect(o.regioes[0]).not.toBe(o.regioes[1]);
        expect(soma).toBeGreaterThanOrEqual(TOTAL * BALANCEAMENTO.objetivos.duplaDeRegioesMin);
        expect(soma).toBeLessThanOrEqual(TOTAL * BALANCEAMENTO.objetivos.duplaDeRegioesMax);
      }
      if (o.tipo === 'derrubar_rival') expect(['b', 'c']).toContain(o.rivalId);
    }
    expect(vistos.size).toBe(5);
  });

  it('sem outros jogadores, nunca sorteia "derrubar rival"', () => {
    for (let s = 1; s <= 100; s++) {
      expect(sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, rivais: [], jaSorteados: [] }).tipo).not.toBe(
        'derrubar_rival',
      );
    }
  });

  it('prefere tipos que ninguém tirou ainda', () => {
    const jaSorteados: Objetivo[] = [
      objetivoMetadeDoMapa(TOTAL),
      { tipo: 'populacao', populacao: 100 },
      { tipo: 'territorios_defendidos', territorios: 12, guarnicaoMinima: 10 },
      { tipo: 'duas_regioes', regioes: ['r2', 'r3'] },
    ];
    for (let s = 1; s <= 50; s++) {
      expect(sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, rivais: ['b'], jaSorteados }).tipo).toBe(
        'derrubar_rival',
      );
    }
  });
});

describe('avaliarObjetivo', () => {
  const meus = (regioes: string[], tropas = 0) => regioes.map((regiaoId) => ({ regiaoId, minhasTropas: tropas }));

  it('duas regiões: precisa de todos os territórios das duas', () => {
    const obj: Objetivo = { tipo: 'duas_regioes', regioes: ['r2', 'r4'] };
    const quase = avaliarObjetivo(obj, situacao({ meusTerritorios: meus([...Array(5).fill('r2'), 'r4', 'r4', 'r4', 'r1']) }));
    expect(quase).toMatchObject({ cumprido: false, atual: 8, alvo: 9 });
    const feito = avaliarObjetivo(obj, situacao({ meusTerritorios: meus([...Array(5).fill('r2'), ...Array(4).fill('r4')]) }));
    expect(feito.cumprido).toBe(true);
  });

  it('metade do mapa: 55% dos territórios', () => {
    const obj = objetivoMetadeDoMapa(TOTAL);
    expect(obj).toEqual({ tipo: 'metade_do_mapa', territorios: 17 });
    expect(avaliarObjetivo(obj, situacao({ meusTerritorios: meus(Array(16).fill('r1')) })).cumprido).toBe(false);
    expect(avaliarObjetivo(obj, situacao({ meusTerritorios: meus(Array(17).fill('r1')) })).cumprido).toBe(true);
  });

  it('territórios defendidos: só contam os que têm a guarnição mínima', () => {
    const obj: Objetivo = { tipo: 'territorios_defendidos', territorios: 3, guarnicaoMinima: 10 };
    const s = situacao({
      meusTerritorios: [
        { regiaoId: 'r1', minhasTropas: 10 },
        { regiaoId: 'r1', minhasTropas: 25 },
        { regiaoId: 'r1', minhasTropas: 9 },
      ],
    });
    expect(avaliarObjetivo(obj, s)).toMatchObject({ cumprido: false, atual: 2, alvo: 3 });
  });

  it('população: conta habitantes inteiros', () => {
    const obj: Objetivo = { tipo: 'populacao', populacao: 100 };
    expect(avaliarObjetivo(obj, situacao({ populacao: 99.9 })).cumprido).toBe(false);
    expect(avaliarObjetivo(obj, situacao({ populacao: 100 })).cumprido).toBe(true);
  });

  it('derrubar rival: precisa reduzi-lo à cidade, tendo conquistado algo dele', () => {
    const obj: Objetivo = { tipo: 'derrubar_rival', rivalId: 'b' };
    const rival = (territorios: number, conquisteiDele: boolean, outrosConquistaramDele = false) =>
      situacao({ rival: { territorios, conquisteiDele, outrosConquistaramDele } });
    expect(avaliarObjetivo(obj, rival(3, true))).toMatchObject({ cumprido: false, atual: 2 });
    expect(avaliarObjetivo(obj, rival(1, true)).cumprido).toBe(true);
    // Rival que nunca saiu da cidade não conta como derrubado.
    expect(avaliarObjetivo(obj, rival(1, false))).toEqual({ cumprido: false, atual: 0, alvo: 0 });
  });

  it('derrubar rival vira "metade do mapa" se outro jogador derrubar o rival antes', () => {
    const r = avaliarObjetivo({ tipo: 'derrubar_rival', rivalId: 'b' }, situacao({ rival: { territorios: 1, conquisteiDele: false, outrosConquistaramDele: true } }));
    expect(r.cumprido).toBe(false);
    expect(r.viraObjetivo).toEqual(objetivoMetadeDoMapa(TOTAL));
  });
});

describe('pontos e prazo', () => {
  it('pontua territórios, habitantes e vitórias', () => {
    const { porTerritorio, porHabitante, porVitoria } = BALANCEAMENTO.pontos;
    expect(pontuar({ territorios: 3, populacao: 40.7, vitorias: 2 })).toBe(3 * porTerritorio + 40 * porHabitante + 2 * porVitoria);
  });

  it('o prazo é o início mais a duração da temporada', () => {
    expect(fimDaTemporada(0)).toBe(BALANCEAMENTO.temporada.duracaoDias * 24 * HORA_MS);
  });

  it('vence por pontos quem tem mais, desempatando por territórios', () => {
    const placar = [
      { jogadorId: 'a', pontos: 100, territorios: 3 },
      { jogadorId: 'b', pontos: 100, territorios: 5 },
      { jogadorId: 'c', pontos: 90, territorios: 9 },
    ];
    expect(vencedorPorPontos(placar)?.jogadorId).toBe('b');
    expect(vencedorPorPontos([])).toBeNull();
  });
});
