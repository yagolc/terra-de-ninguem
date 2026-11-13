import { fimProtecaoIniciante } from './ataques.ts';
import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  avaliarObjetivo,
  cidadesAlheiasPorRegiao,
  fimDaTemporada,
  metaMetadeDoMapa,
  metaSenhorDasVilas,
  monopolioComercial,
  objetivoMetadeDoMapa,
  pontuar,
  sortearObjetivo,
  vencedorPorPontos,
  type Objetivo,
  racasVizinhas,
  vizinhancaDaCidade,
  type SituacaoJogador,
  relogioDoObjetivo,
} from './objetivos.ts';
import { limitePopulacao, nivelArmazemNecessario } from './predios.ts';
import { TIPOS_PREDIO } from './tipos.ts';
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
    cidadesAlheiasPorRegiao: new Map(),
    totalTerritorios: TOTAL,
    populacao: 10,
    vitoriasContraJogadores: 0,
    niveisPredios: [1, 0, 0, 0, 0, 0, 0, 0],
    nivelMuralha: 0,
    niveisVilas: [],
    ouro: 0,
    cidadesLivres: [],
    agora: 0,
    ...mudancas,
  };
}

describe('objetivos perto da cidade', () => {
  // Uma fileira de regiões r1–r6, cada uma com 2 territórios (rX-a e rX-b), ligadas em linha: r1 — r2 — ... — r6.
  const territorios = REGIOES.flatMap((r) => [
    { id: `${r.id}-a`, regiaoId: r.id },
    { id: `${r.id}-b`, regiaoId: r.id },
  ]);
  const fronteiras: [string, string][] = [];
  for (let i = 1; i <= 6; i++) {
    fronteiras.push([`r${i}-a`, `r${i}-b`]);
    if (i < 6) fronteiras.push([`r${i}-b`, `r${i + 1}-a`]);
  }

  it('a vizinhança sabe a região da cidade, as vizinhas e a distância de cada região', () => {
    const v = vizinhancaDaCidade({ territorios, fronteiras, cidadeTerritorioId: 'r3-a' })!;
    expect(v.regiao).toBe('r3');
    expect(v.regioesVizinhas).toEqual(['r2', 'r4']);
    expect(v.distanciaDasRegioes.get('r3')).toBe(0);
    expect(v.distanciaDasRegioes.get('r2')).toBe(1);
    expect(v.distanciaDasRegioes.get('r6')).toBe(6);
  });

  it('"duas regiões" sai da região da cidade mais uma vizinha (300 sorteios)', () => {
    const cidade = vizinhancaDaCidade({ territorios, fronteiras, cidadeTerritorioId: 'r3-a' })!;
    let vistas = 0;
    for (let s = 1; s <= 300; s++) {
      const o = sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, jaSorteados: [], cidade });
      if (o.tipo !== 'duas_regioes') continue;
      vistas++;
      expect(o.regioes).toContain('r3');
      expect(o.regioes.some((r) => r === 'r2' || r === 'r4')).toBe(true);
    }
    expect(vistas).toBeGreaterThan(0);
  });

  it('sem dupla com a região da cidade no tamanho certo, sai a dupla mais perto', () => {
    // r4 (4 territórios) com r3 ou r5 (5) dá 9 de 30: pequeno demais. Cidade em r4: vale a dupla mais perto.
    const cidade = vizinhancaDaCidade({ territorios, fronteiras, cidadeTerritorioId: 'r4-a' })!;
    for (let s = 1; s <= 300; s++) {
      const o = sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, jaSorteados: [], cidade });
      if (o.tipo !== 'duas_regioes') continue;
      const soma = o.regioes.reduce((t, r) => t + cidade.distanciaDasRegioes.get(r)!, 0);
      // r3 e r5 estão a 1 fronteira de r4-a e a 2 (r4-a → r4-b → r5-a); r2+r3, r3+r5... a menor soma possível.
      expect(soma).toBeLessThanOrEqual(3);
    }
  });

  it('"velha rixa" só mira raças de vizinhos próximos', () => {
    const maxima = BALANCEAMENTO.objetivos.rixaDistanciaMaxima;
    const outros = [
      { territorioId: 'r3-b', raca: 'orc' as const }, // 1 fronteira
      { territorioId: 'r1-a', raca: 'anao' as const }, // 4 fronteiras de r3-a
      { territorioId: 'r6-b', raca: 'humano' as const }, // longe
      { territorioId: 'r4-a', raca: 'elfo' as const }, // vizinho, mas da minha raça
    ];
    const racas = racasVizinhas({ fronteiras, cidadeTerritorioId: 'r3-a', minhaRaca: 'elfo', outros });
    expect(maxima).toBe(4);
    expect(racas).toEqual(['anao', 'orc']);
    expect(racasVizinhas({ fronteiras, cidadeTerritorioId: 'r6-b', minhaRaca: 'humano', outros: outros.slice(0, 2) })).toEqual([]);
  });
});

describe('sortearObjetivo', () => {
  it('a mesma semente sorteia o mesmo objetivo', () => {
    const entrada = { semente: 42, regioes: REGIOES, totalTerritorios: TOTAL, racasRivais: ['orc' as const], jaSorteados: [] };
    expect(sortearObjetivo(entrada)).toEqual(sortearObjetivo(entrada));
  });

  it('sorteia objetivos válidos e variados (300 sorteios)', () => {
    const vistos = new Set<string>();
    for (let s = 1; s <= 300; s++) {
      const o = sortearObjetivo({
        semente: s,
        regioes: REGIOES,
        totalTerritorios: TOTAL,
        racasRivais: ['orc', 'anao'],
        jaSorteados: [],
        vilasNoMapa: 8,
      });
      vistos.add(o.tipo);
      if (o.tipo === 'duas_regioes') {
        const soma = o.regioes.reduce((t, id) => t + REGIOES.find((r) => r.id === id)!.territorios, 0);
        expect(o.regioes[0]).not.toBe(o.regioes[1]);
        expect(soma).toBeGreaterThanOrEqual(TOTAL * BALANCEAMENTO.objetivos.duplaDeRegioesMin);
        expect(soma).toBeLessThanOrEqual(TOTAL * BALANCEAMENTO.objetivos.duplaDeRegioesMax);
      }
      if (o.tipo === 'velha_rixa') {
        expect(['orc', 'anao']).toContain(o.raca);
        expect(o.territorios).toBe(BALANCEAMENTO.objetivos.rixaTerritorios);
      }
      if (o.tipo === 'senhor_das_vilas') expect(o).toEqual({ tipo: 'senhor_das_vilas', vilas: 4, nivel: BALANCEAMENTO.povoados.vila.nivelMaximo });
      expect(o.tipo).not.toBe('derrubar_rival');
      expect(o.tipo).not.toBe('populacao');
    }
    expect(vistos.size).toBe(8);
  });

  it('"senhor das vilas" pede metade das vilas do mapa, e não sai se o mapa tem menos de 3 vilas', () => {
    expect(metaSenhorDasVilas(8)).toBe(4);
    expect(metaSenhorDasVilas(6)).toBe(3);
    expect(metaSenhorDasVilas(7)).toBe(4);
    for (let s = 1; s <= 100; s++) {
      const base = { semente: s, regioes: REGIOES, totalTerritorios: TOTAL, racasRivais: ['orc' as const], jaSorteados: [] };
      expect(sortearObjetivo({ ...base, vilasNoMapa: 2 }).tipo).not.toBe('senhor_das_vilas');
      expect(sortearObjetivo(base).tipo).not.toBe('senhor_das_vilas');
    }
  });

  it('sem outra raça no mapa, nunca sorteia "velha rixa"', () => {
    for (let s = 1; s <= 100; s++) {
      expect(sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, racasRivais: [], jaSorteados: [] }).tipo).not.toBe(
        'velha_rixa',
      );
    }
  });

  it('prefere tipos que ninguém tirou ainda', () => {
    const jaSorteados: Objetivo[] = [
      objetivoMetadeDoMapa(),
      { tipo: 'senhor_das_vilas', vilas: 4, nivel: 3 },
      { tipo: 'territorios_defendidos', territorios: 12, guarnicaoMinima: 10 },
      { tipo: 'duas_regioes', regioes: ['r2', 'r3'] },
      { tipo: 'senhor_da_guerra', vitorias: 30 },
      { tipo: 'mestre_construtor', predios: 6, nivel: 10 },
      { tipo: 'tesouro', ouro: 7500 },
    ];
    for (let s = 1; s <= 50; s++) {
      expect(
        sortearObjetivo({ semente: s, regioes: REGIOES, totalTerritorios: TOTAL, racasRivais: ['elfo'], jaSorteados, vilasNoMapa: 8 }).tipo,
      ).toBe('velha_rixa');
    }
  });
});

describe('avaliarObjetivo', () => {
  const meus = (regioes: string[], tropas = 0) => regioes.map((regiaoId, i) => ({ id: `t${i}`, regiaoId, minhasTropas: tropas }));

  it('duas regiões: precisa de todos os territórios das duas', () => {
    const obj: Objetivo = { tipo: 'duas_regioes', regioes: ['r2', 'r4'] };
    const quase = avaliarObjetivo(obj, situacao({ meusTerritorios: meus([...Array(5).fill('r2'), 'r4', 'r4', 'r4', 'r1']) }));
    expect(quase).toMatchObject({ cumprido: false, atual: 8, alvo: 9 });
    const feito = avaliarObjetivo(obj, situacao({ meusTerritorios: meus([...Array(5).fill('r2'), ...Array(4).fill('r4')]) }));
    expect(feito.cumprido).toBe(true);
  });

  it('duas regiões: cidade principal de outro jogador não conta (não pode ser conquistada)', () => {
    const obj: Objetivo = { tipo: 'duas_regioes', regioes: ['r2', 'r4'] };
    const comCidade = situacao({ cidadesAlheiasPorRegiao: new Map([['r4', 1]]) });
    const feito = avaliarObjetivo(obj, { ...comCidade, meusTerritorios: meus([...Array(5).fill('r2'), ...Array(3).fill('r4')]) });
    expect(feito).toMatchObject({ cumprido: true, atual: 8, alvo: 8 });
  });

  it('conta só as cidades principais dos outros, por região', () => {
    const contagem = cidadesAlheiasPorRegiao(
      [
        { regiaoId: 'r1', donoId: 'eu', cidadePrincipal: true },
        { regiaoId: 'r1', donoId: 'b', cidadePrincipal: true },
        { regiaoId: 'r2', donoId: 'b', cidadePrincipal: false },
        { regiaoId: 'r3', donoId: null, cidadePrincipal: false },
        { regiaoId: 'r3', donoId: 'c', cidadePrincipal: true },
      ],
      'eu',
    );
    expect([...contagem]).toEqual([['r1', 1], ['r3', 1]]);
  });

  it('metade do mapa: 55% dos territórios conquistáveis', () => {
    const obj = objetivoMetadeDoMapa();
    expect(avaliarObjetivo(obj, situacao({ meusTerritorios: meus(Array(16).fill('r1')) })).cumprido).toBe(false);
    expect(avaliarObjetivo(obj, situacao({ meusTerritorios: meus(Array(17).fill('r1')) })).cumprido).toBe(true);
    // 3 cidades de outros jogadores: sobram 27 conquistáveis, meta de 15.
    const comCidades = situacao({ cidadesAlheiasPorRegiao: new Map([['r2', 2], ['r5', 1]]) });
    expect(avaliarObjetivo(obj, { ...comCidades, meusTerritorios: meus(Array(14).fill('r1')) })).toMatchObject({ cumprido: false, alvo: 15 });
    expect(avaliarObjetivo(obj, { ...comCidades, meusTerritorios: meus(Array(15).fill('r1')) }).cumprido).toBe(true);
  });

  it('meta de metade do mapa nunca passa do que dá para conquistar', () => {
    for (let cidades = 0; cidades < TOTAL; cidades++) {
      const meta = metaMetadeDoMapa(TOTAL, cidades);
      expect(meta).toBeLessThanOrEqual(TOTAL - cidades);
    }
    expect(metaMetadeDoMapa(TOTAL, 0)).toBe(17);
    expect(metaMetadeDoMapa(TOTAL, 5)).toBe(14);
  });

  it('territórios defendidos: só contam os que têm a guarnição mínima', () => {
    const obj: Objetivo = { tipo: 'territorios_defendidos', territorios: 3, guarnicaoMinima: 10 };
    const s = situacao({
      meusTerritorios: [
        { id: 'a', regiaoId: 'r1', minhasTropas: 10 },
        { id: 'b', regiaoId: 'r1', minhasTropas: 25 },
        { id: 'c', regiaoId: 'r1', minhasTropas: 9 },
      ],
    });
    expect(avaliarObjetivo(obj, s)).toMatchObject({ cumprido: false, atual: 2, alvo: 3 });
  });

  it('fronteiras de ferro: o sorteio pede a Muralha no nível máximo, e sem ela não cumpre', () => {
    const maxima = BALANCEAMENTO.predios.muralha.nivelMaximo;
    let sorteado: Objetivo | null = null;
    for (let semente = 1; semente < 500 && !sorteado; semente++) {
      const o = sortearObjetivo({ semente, regioes: REGIOES, totalTerritorios: TOTAL, racasRivais: [], jaSorteados: [] });
      if (o.tipo === 'territorios_defendidos') sorteado = o;
    }
    expect(sorteado).toMatchObject({ tipo: 'territorios_defendidos', muralha: maxima });

    const obj: Objetivo = { tipo: 'territorios_defendidos', territorios: 2, guarnicaoMinima: 5, muralha: maxima };
    const meusTerritorios = [
      { id: 'a', regiaoId: 'r1', minhasTropas: 5 },
      { id: 'b', regiaoId: 'r1', minhasTropas: 8 },
    ];
    expect(avaliarObjetivo(obj, situacao({ meusTerritorios, nivelMuralha: maxima - 1 }))).toMatchObject({
      cumprido: false,
      atual: 2,
      partes: [{ atual: maxima - 1, alvo: maxima }],
    });
    expect(avaliarObjetivo(obj, situacao({ meusTerritorios, nivelMuralha: maxima })).cumprido).toBe(true);
    // Carta antiga (sem muralha): só os territórios contam.
    expect(avaliarObjetivo({ ...obj, muralha: undefined }, situacao({ meusTerritorios })).cumprido).toBe(true);
  });
});

describe('segurar o objetivo', () => {
  const H = 3_600_000;
  const SEGURAR = BALANCEAMENTO.objetivos.segurarHoras * H;
  const inicio = 0;
  const depoisDaProtecao = fimProtecaoIniciante(inicio) + 10 * H;

  it('cumprir liga o relógio; vence só depois das horas seguidas', () => {
    const ligou = relogioDoObjetivo({ cumprido: true, segurandoDesde: null, agora: depoisDaProtecao, inicioTemporada: inicio });
    expect(ligou).toEqual({ segurandoDesde: depoisDaProtecao, venceEm: depoisDaProtecao + SEGURAR, venceu: false });
    const quase = relogioDoObjetivo({ cumprido: true, segurandoDesde: depoisDaProtecao, agora: depoisDaProtecao + SEGURAR - 1, inicioTemporada: inicio });
    expect(quase.venceu).toBe(false);
    const venceu = relogioDoObjetivo({ cumprido: true, segurandoDesde: depoisDaProtecao, agora: depoisDaProtecao + SEGURAR, inicioTemporada: inicio });
    expect(venceu.venceu).toBe(true);
  });

  it('deixar de cumprir zera o relógio', () => {
    expect(relogioDoObjetivo({ cumprido: false, segurandoDesde: depoisDaProtecao, agora: depoisDaProtecao + SEGURAR, inicioTemporada: inicio })).toEqual({
      segurandoDesde: null,
      venceEm: null,
      venceu: false,
    });
  });

  it('não corre durante a proteção de iniciante', () => {
    const cedo = 1 * H;
    const r = relogioDoObjetivo({ cumprido: true, segurandoDesde: cedo, agora: cedo + SEGURAR, inicioTemporada: inicio });
    expect(r).toEqual({ segurandoDesde: cedo, venceEm: fimProtecaoIniciante(inicio) + SEGURAR, venceu: false });
  });
});

describe('avaliarObjetivo (outros tipos)', () => {
  it('população: conta habitantes inteiros', () => {
    const obj: Objetivo = { tipo: 'populacao', populacao: 100 };
    expect(avaliarObjetivo(obj, situacao({ populacao: 99.9 })).cumprido).toBe(false);
    expect(avaliarObjetivo(obj, situacao({ populacao: 100 })).cumprido).toBe(true);
  });

  it('senhor das vilas: conta as vilas no nível pedido; a barra soma os níveis das mais altas', () => {
    const obj: Objetivo = { tipo: 'senhor_das_vilas', vilas: 4, nivel: 3 };
    const quase = avaliarObjetivo(obj, situacao({ niveisVilas: [3, 3, 3, 2, 1] }));
    expect(quase).toMatchObject({ cumprido: false, atual: 11, alvo: 12, partes: [{ atual: 3, alvo: 4 }] });
    expect(avaliarObjetivo(obj, situacao({ niveisVilas: [3, 3, 3, 3] })).cumprido).toBe(true);
    expect(avaliarObjetivo(obj, situacao({ niveisVilas: [] }))).toMatchObject({ cumprido: false, atual: 0 });
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
    expect(r.viraObjetivo).toEqual(objetivoMetadeDoMapa());
  });

  it('senhor da guerra e tesouro: contam vitórias contra jogadores e ouro inteiro', () => {
    const guerra: Objetivo = { tipo: 'senhor_da_guerra', vitorias: 25 };
    expect(avaliarObjetivo(guerra, situacao({ vitoriasContraJogadores: 24 }))).toMatchObject({ cumprido: false, atual: 24, alvo: 25 });
    expect(avaliarObjetivo(guerra, situacao({ vitoriasContraJogadores: 25 })).cumprido).toBe(true);
    const tesouro: Objetivo = { tipo: 'tesouro', ouro: 6000 };
    expect(avaliarObjetivo(tesouro, situacao({ ouro: 5999.9 })).cumprido).toBe(false);
    expect(avaliarObjetivo(tesouro, situacao({ ouro: 6000 })).cumprido).toBe(true);
  });

  it('mestre construtor: conta os prédios que chegaram ao nível pedido', () => {
    const obj: Objetivo = { tipo: 'mestre_construtor', predios: 6, nivel: 10 };
    // A barra soma os níveis dos 6 prédios mais altos (até 10 cada): 10+10+10+10+10+9 = 59 de 60.
    const quase = avaliarObjetivo(obj, situacao({ niveisPredios: [10, 10, 10, 10, 10, 9, 3, 1] }));
    expect(quase).toMatchObject({ cumprido: false, atual: 59, alvo: 60, partes: [{ atual: 5, alvo: 6 }] });
    expect(avaliarObjetivo(obj, situacao({ niveisPredios: [10, 10, 10, 10, 10, 10, 0, 0] })).cumprido).toBe(true);
  });

  it('velha rixa: territórios diferentes conquistados, ou a raça toda só com as cidades', () => {
    const obj: Objetivo = { tipo: 'velha_rixa', raca: 'orc', territorios: 8 };
    const rixa = (territoriosConquistados: number, todosSoNaCidade = false, jogadoresDaRaca = 1) =>
      avaliarObjetivo(obj, situacao({ rixa: { territoriosConquistados, jogadoresDaRaca, todosSoNaCidade } }));
    expect(rixa(7)).toMatchObject({ cumprido: false, atual: 7, alvo: 8 });
    expect(rixa(8).cumprido).toBe(true);
    // Atalho: a raça inteira só com as cidades, com pelo menos uma conquista do jogador.
    expect(rixa(2, true).cumprido).toBe(true);
    expect(rixa(0, true).cumprido).toBe(false);
    // A raça sumiu do mapa: vira "metade do mapa".
    expect(rixa(3, true, 0).viraObjetivo).toEqual(objetivoMetadeDoMapa());
  });

  it('monopólio comercial: todas as cidades livres pelas horas pedidas, contando da última tomada', () => {
    const obj: Objetivo = { tipo: 'monopolio_comercial', horas: 12 };
    const agora = 100 * HORA_MS;
    const com = (cidadesLivres: { minha: boolean; posseDesde: number | null }[]) => avaliarObjetivo(obj, situacao({ cidadesLivres, agora }));
    const faltaUma = com([
      { minha: true, posseDesde: 0 },
      { minha: true, posseDesde: 0 },
      { minha: false, posseDesde: 0 },
    ]);
    expect(faltaUma).toMatchObject({ cumprido: false, atual: 0, alvo: 12, partes: [{ atual: 2, alvo: 3 }] });
    const recente = com([
      { minha: true, posseDesde: 0 },
      { minha: true, posseDesde: agora - 5 * HORA_MS },
    ]);
    expect(recente).toMatchObject({ cumprido: false, atual: 5 });
    expect(com([{ minha: true, posseDesde: agora - 12 * HORA_MS }]).cumprido).toBe(true);
    // Mapa sem cidades livres: nunca cumpre.
    expect(com([]).cumprido).toBe(false);
  });

  it('monopólio não é mais sorteado: virou a vitória aberta a todos', () => {
    for (let s = 1; s <= 200; s++) {
      const base = { semente: s, regioes: REGIOES, totalTerritorios: TOTAL, jaSorteados: [] };
      expect(sortearObjetivo(base).tipo).not.toBe('monopolio_comercial');
    }
  });

  it('monopólio comercial aberto: um dono com todas as cidades livres, contando da última tomada', () => {
    const agora = 100 * HORA_MS;
    const horas = BALANCEAMENTO.objetivos.monopolioHoras;
    expect(monopolioComercial([], agora)).toBeNull();
    expect(monopolioComercial([{ donoId: null, posseDesde: null }], agora)).toBeNull();
    expect(
      monopolioComercial(
        [
          { donoId: 'a', posseDesde: 0 },
          { donoId: 'b', posseDesde: 0 },
        ],
        agora,
      ),
    ).toBeNull();
    const desde = agora - 5 * HORA_MS;
    expect(
      monopolioComercial(
        [
          { donoId: 'a', posseDesde: 0 },
          { donoId: 'a', posseDesde: desde },
        ],
        agora,
      ),
    ).toEqual({ donoId: 'a', desde, venceEm: desde + horas * HORA_MS, cumprido: false });
    expect(monopolioComercial([{ donoId: 'a', posseDesde: agora - horas * HORA_MS }], agora)?.cumprido).toBe(true);
  });
});

describe('objetivos cabem nos limites do jogo', () => {
  const O = BALANCEAMENTO.objetivos;
  const casasNoMaximo = limitePopulacao(BALANCEAMENTO.predios.casa.nivelMaximo);
  const V = BALANCEAMENTO.povoados.vila;
  it('soldados de "fronteiras de ferro" são no máximo 2/3 da população máxima das casas', () => {
    expect(O.territoriosDefendidos * O.guarnicaoMinima).toBeLessThanOrEqual((casasNoMaximo * 2) / 3);
  });
  it('"senhor das vilas" pede mais de uma vila e deixa vilas para os outros', () => {
    expect(O.fracaoVilas).toBeGreaterThan(0);
    expect(O.fracaoVilas).toBeLessThanOrEqual(0.5);
    expect(V.nivelMaximo).toBeGreaterThanOrEqual(1);
  });
  it('prédios pedidos existem no jogo', () => {
    expect(O.mestreConstrutorPredios).toBeLessThanOrEqual(TIPOS_PREDIO.length);
    const chegamAoNivel = TIPOS_PREDIO.filter((p) => BALANCEAMENTO.predios[p].nivelMaximo >= O.mestreConstrutorNivel);
    expect(chegamAoNivel.length).toBeGreaterThanOrEqual(O.mestreConstrutorPredios);
  });
  it('o tesouro cabe no armazém máximo, mas não no penúltimo', () => {
    expect(nivelArmazemNecessario(O.ouroGuardado)).toBe(BALANCEAMENTO.predios.armazem.nivelMaximo);
  });
});

describe('pontos e prazo', () => {
  it('pontua territórios, habitantes e vitórias', () => {
    const { porTerritorio, porHabitante, porVitoria } = BALANCEAMENTO.pontos;
    expect(pontuar({ territorios: 3, populacao: 40.7, vitorias: 2 })).toBe(3 * porTerritorio + 40 * porHabitante + 2 * porVitoria);
  });

  it('cabeça a prêmio: vitórias contra o herdeiro valem pontos a mais', () => {
    const sem = pontuar({ territorios: 3, populacao: 40, vitorias: 2 });
    expect(pontuar({ territorios: 3, populacao: 40, vitorias: 2, vitoriasContraHerdeiro: 1 })).toBe(sem + BALANCEAMENTO.herdeiro.pontosPorVitoria);
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
