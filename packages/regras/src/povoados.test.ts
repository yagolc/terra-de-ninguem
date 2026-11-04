import { describe, expect, it } from 'vitest';
import { geradorComSemente } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { forcaDefesa } from './batalha.ts';
import {
  bonusDosPovoados,
  custoNivelVila,
  estoqueVila,
  lealDesdeNaConquista,
  povoadoLeal,
  saquearVilaDeJogador,
  saquearVilaNeutra,
  verificarMelhoriaVila,
  vilaCheiaEm,
} from './povoados.ts';
import { atualizarCidade, cidadeInicial, limitePopulacaoCidade } from './producao.ts';
import { limitePopulacao } from './predios.ts';
import { capacidadeCarga } from './saque.ts';
import { RECURSOS } from './tipos.ts';
import { HORA_MS, exercito, recursos } from './util.ts';

const V = BALANCEAMENTO.povoados.vila;
const ENCHER = V.horasParaEncher * HORA_MS;
const AGORA = 100 * HORA_MS;
const total = (r: { comida: number; madeira: number; ouro: number }) => RECURSOS.reduce((s, k) => s + r[k], 0);

describe('estoque da vila neutra', () => {
  it('nunca saqueada está cheia; volta a encher aos poucos depois do saque', () => {
    expect(estoqueVila(null, AGORA)).toEqual(V.estoque);
    expect(estoqueVila(AGORA, AGORA)).toEqual(recursos());
    expect(estoqueVila(AGORA - ENCHER / 2, AGORA).madeira).toBe(Math.floor(V.estoque.madeira / 2));
    expect(estoqueVila(AGORA - 2 * ENCHER, AGORA)).toEqual(V.estoque);
    expect(vilaCheiaEm(AGORA - ENCHER / 2, AGORA)).toBe(AGORA + ENCHER / 2);
  });

  it('o saque leva tudo que couber na carga, e o que sobra continua lá', () => {
    const muitos = saquearVilaNeutra({ saqueadaEm: null, agora: AGORA, sobreviventes: exercito({ cavalaria: 100 }) });
    expect(muitos.saque).toEqual(V.estoque);
    expect(estoqueVila(muitos.saqueadaEm, AGORA)).toEqual(recursos());

    const poucos = exercito({ lanceiro: 10 });
    const r = saquearVilaNeutra({ saqueadaEm: null, agora: AGORA, sobreviventes: poucos });
    expect(total(r.saque)).toBeLessThanOrEqual(capacidadeCarga(poucos));
    // Sobrou o resto: a vila não fica vazia.
    const sobra = estoqueVila(r.saqueadaEm, AGORA);
    expect(total(sobra)).toBeGreaterThan(0);
    expect(total(sobra) + total(r.saque)).toBeLessThanOrEqual(total(V.estoque));
  });

  it('nunca leva mais que o estoque nem mais que a carga (300 casos)', () => {
    const aleatorio = geradorComSemente(7);
    for (let i = 0; i < 300; i++) {
      const saqueadaEm = aleatorio() < 0.2 ? null : AGORA - aleatorio() * 2 * ENCHER;
      const tropas = exercito({ lanceiro: Math.floor(aleatorio() * 40), cavalaria: Math.floor(aleatorio() * 20) });
      const antes = estoqueVila(saqueadaEm, AGORA);
      const { saque, saqueadaEm: depois } = saquearVilaNeutra({ saqueadaEm, agora: AGORA, sobreviventes: tropas });
      for (const r of RECURSOS) expect(saque[r]).toBeLessThanOrEqual(antes[r]);
      expect(total(saque)).toBeLessThanOrEqual(capacidadeCarga(tropas));
      expect(depois).toBeLessThanOrEqual(AGORA);
    }
  });
});

describe('vila de jogador', () => {
  it('melhorar: só vila própria, até o nível máximo, com recursos', () => {
    const rico = recursos({ comida: 1e6, madeira: 1e6, ouro: 1e6 });
    const vila = { tipo: 'vila' as const, nivel: 1 };
    expect(verificarMelhoriaVila({ povoado: vila, doJogador: true, recursos: rico })).toEqual({
      ok: true,
      nivelAlvo: 2,
      custo: custoNivelVila(2),
    });
    expect(verificarMelhoriaVila({ povoado: vila, doJogador: false, recursos: rico })).toEqual({ ok: false, motivo: 'povoado_invalido' });
    expect(verificarMelhoriaVila({ povoado: { tipo: 'cidade_livre', nivel: 0 }, doJogador: true, recursos: rico }).ok).toBe(false);
    expect(verificarMelhoriaVila({ povoado: { tipo: 'vila', nivel: V.nivelMaximo }, doJogador: true, recursos: rico })).toEqual({
      ok: false,
      motivo: 'nivel_maximo',
    });
    expect(verificarMelhoriaVila({ povoado: vila, doJogador: true, recursos: recursos() })).toEqual({
      ok: false,
      motivo: 'recursos_insuficientes',
    });
  });

  it('o saque leva parte do que foi investido, até a carga', () => {
    const investidoNivel2 = custoNivelVila(1).madeira + custoNivelVila(2).madeira;
    const muitos = saquearVilaDeJogador({ nivel: 2, sobreviventes: exercito({ cavalaria: 100 }) });
    expect(muitos.madeira).toBe(Math.floor(investidoNivel2 * V.fracaoSaqueInvestido));
    expect(saquearVilaDeJogador({ nivel: 0, sobreviventes: exercito({ cavalaria: 100 }) })).toEqual(recursos());
    const poucos = exercito({ lanceiro: 2 });
    expect(total(saquearVilaDeJogador({ nivel: 3, sobreviventes: poucos }))).toBeLessThanOrEqual(capacidadeCarga(poucos));
  });
});

describe('lealdade e bônus', () => {
  it('povoado neutro é leal na hora; tomado de jogador, só depois da lealdade', () => {
    expect(lealDesdeNaConquista(AGORA, false)).toBe(AGORA);
    const desde = lealDesdeNaConquista(AGORA, true);
    expect(desde).toBe(AGORA + BALANCEAMENTO.povoados.lealdadeHoras * HORA_MS);
    expect(povoadoLeal(desde, desde - 1)).toBe(false);
    expect(povoadoLeal(desde, desde)).toBe(true);
    expect(povoadoLeal(null, AGORA)).toBe(false);
  });

  it('vilas leais dão população; cidades livres leais dão ouro', () => {
    const bonus = bonusDosPovoados(
      [
        { tipo: 'vila', nivel: 2, lealDesde: 0 },
        { tipo: 'vila', nivel: 3, lealDesde: AGORA + 1 },
        { tipo: 'cidade_livre', nivel: 0, lealDesde: 0 },
        { tipo: 'cidade_livre', nivel: 0, lealDesde: null },
      ],
      AGORA,
    );
    expect(bonus.populacaoExtra).toBe(2 * V.populacaoPorNivel);
    expect(bonus.producaoFixaHora).toEqual(recursos({ ouro: BALANCEAMENTO.povoados.cidadeLivre.ouroHora }));
  });

  it('a cidade cresce além das casas com as vilas e recebe o ouro das cidades livres', () => {
    const cidade = { ...cidadeInicial(0), populacao: limitePopulacao(0) };
    const ouroHora = BALANCEAMENTO.povoados.cidadeLivre.ouroHora;
    const r = atualizarCidade({
      cidade,
      tropas: exercito(),
      agora: 10 * HORA_MS,
      populacaoExtra: 10,
      producaoFixaHora: recursos({ ouro: ouroHora }),
    });
    expect(r.cidade.populacao).toBe(limitePopulacao(0) + 10);
    expect(r.cidade.recursos.ouro).toBe(cidade.recursos.ouro + 10 * ouroHora);
  });

  it('o limite das casas cresce com o bônus da raça, e as vilas somam por cima', () => {
    const cidade = { ...cidadeInicial(0), predios: { ...cidadeInicial(0).predios, casa: 10 } };
    expect(limitePopulacaoCidade(cidade, 0, 0.1)).toBe(Math.floor(limitePopulacao(10) * 1.1));
    expect(limitePopulacaoCidade(cidade, 5, 0.1)).toBe(Math.floor(limitePopulacao(10) * 1.1) + 5);
  });

  it('a muralha da cidade livre aumenta a defesa', () => {
    const tropas = exercito({ lanceiro: 10 });
    const sem = forcaDefesa(tropas, tropas, 'planicie', 0);
    const com = forcaDefesa(tropas, tropas, 'planicie', 0, false, true);
    expect(com).toBeCloseTo(sem * (1 + BALANCEAMENTO.povoados.cidadeLivre.bonusDefesa));
  });
});
