import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { resolverBatalha } from './batalha.ts';
import {
  bonusHeroi,
  bonusIntendente,
  bonusSeDisponivel,
  custoTreinoHeroi,
  feridoAte,
  heroiDisponivel,
  nomeHeroiValido,
  tempoTreinoHeroiMs,
  verificarRecrutamento,
  verificarTreinoHeroi,
  type Heroi,
} from './herois.ts';
import { duracaoMarchaMs } from './marcha.ts';
import { nivelArmazemNecessario } from './predios.ts';
import { atualizarCidade, cidadeInicial } from './producao.ts';
import { capacidadeCarga, calcularSaque } from './saque.ts';
import { HORA_MS, exercito, recursos } from './util.ts';

const H = BALANCEAMENTO.herois;
const AGORA = 1_000 * HORA_MS;
const RICO = recursos({ comida: 1e6, madeira: 1e6, ouro: 1e6 });
const heroi = (mudancas: Partial<Heroi> = {}): Heroi => ({
  nome: 'Zé',
  especialidade: 'comandante',
  nivel: 5,
  territorioId: 'cidade',
  marchaId: null,
  treinoProntoEm: null,
  feridoAte: null,
  ...mudancas,
});

describe('recrutar', () => {
  const recrutar = (mudancas: Partial<Parameters<typeof verificarRecrutamento>[0]> = {}) =>
    verificarRecrutamento({
      jaTemHeroi: false,
      nivelQuartel: 1,
      habitantesLivres: 3,
      recursos: RICO,
      nome: '  Tiradentes ',
      especialidade: 'castelao',
      ...mudancas,
    });

  it('aceita e limpa o nome', () => {
    expect(recrutar()).toEqual({ ok: true, custo: H.custoRecrutar, nome: 'Tiradentes', especialidade: 'castelao' });
  });

  it('recusa com os motivos certos', () => {
    expect(recrutar({ jaTemHeroi: true })).toEqual({ ok: false, motivo: 'ja_tem_heroi' });
    expect(recrutar({ nivelQuartel: 0 })).toEqual({ ok: false, motivo: 'sem_quartel' });
    expect(recrutar({ nome: 'X' })).toEqual({ ok: false, motivo: 'nome_invalido' });
    expect(recrutar({ especialidade: 'mago' })).toEqual({ ok: false, motivo: 'especialidade_invalida' });
    expect(recrutar({ habitantesLivres: 0 })).toEqual({ ok: false, motivo: 'sem_populacao' });
    expect(recrutar({ recursos: recursos() })).toEqual({ ok: false, motivo: 'recursos_insuficientes' });
  });

  it('nomes: letras, espaços, apóstrofo e hífen, de 2 a 20', () => {
    expect(nomeHeroiValido('Maria Quitéria')).toBe(true);
    expect(nomeHeroiValido("D'Ávila")).toBe(true);
    expect(nomeHeroiValido('<script>')).toBe(false);
    expect(nomeHeroiValido('a'.repeat(21))).toBe(false);
  });
});

describe('treino', () => {
  it('custo e tempo crescem a cada nível', () => {
    expect(custoTreinoHeroi(2)).toEqual(recursos({ ouro: H.treino.ouroBase }));
    expect(tempoTreinoHeroiMs(2)).toBe(H.treino.minutosBase * 60_000);
    expect(custoTreinoHeroi(10).ouro).toBeGreaterThan(custoTreinoHeroi(9).ouro);
    expect(tempoTreinoHeroiMs(10)).toBeGreaterThan(tempoTreinoHeroiMs(9));
  });

  it('cada treino cabe num armazém que existe, e o total é um bom ralo de ouro', () => {
    let total = 0;
    for (let n = 2; n <= H.nivelMaximo; n++) {
      total += custoTreinoHeroi(n).ouro;
      expect(nivelArmazemNecessario(custoTreinoHeroi(n).ouro)).not.toBeNull();
    }
    expect(total).toBeGreaterThan(10_000);
  });

  it('só treina na cidade, livre, abaixo do máximo e com ouro', () => {
    const treinar = (h: Heroi | null, r = RICO) => verificarTreinoHeroi({ heroi: h, recursos: r, agora: AGORA });
    expect(treinar(heroi())).toEqual({ ok: true, nivelAlvo: 6, custo: custoTreinoHeroi(6), prontoEm: AGORA + tempoTreinoHeroiMs(6) });
    expect(treinar(null)).toEqual({ ok: false, motivo: 'sem_heroi' });
    expect(treinar(heroi({ nivel: H.nivelMaximo }))).toEqual({ ok: false, motivo: 'nivel_maximo' });
    expect(treinar(heroi({ treinoProntoEm: AGORA + 1 }))).toEqual({ ok: false, motivo: 'em_treino' });
    expect(treinar(heroi({ feridoAte: feridoAte(AGORA) }))).toEqual({ ok: false, motivo: 'ferido' });
    // Treina em qualquer território onde estiver parado; só não em marcha.
    expect(treinar(heroi({ territorioId: 'longe' })).ok).toBe(true);
    expect(treinar(heroi({ territorioId: null, marchaId: 'm' }))).toEqual({ ok: false, motivo: 'em_marcha' });
    expect(treinar(heroi(), recursos())).toEqual({ ok: false, motivo: 'recursos_insuficientes' });
  });
});

describe('disponibilidade e bônus', () => {
  it('intendente +2% por nível (até +20%); os de guerra valem mais, porque só ajudam em batalha e arriscam ferimento', () => {
    expect(bonusHeroi(1, 'intendente')).toBeCloseTo(0.02);
    expect(bonusHeroi(H.nivelMaximo, 'intendente')).toBeCloseTo(0.2);
    expect(bonusHeroi(H.nivelMaximo, 'comandante')).toBeCloseTo(0.3);
    for (const e of ['comandante', 'castelao', 'desbravador', 'saqueador'] as const) {
      expect(bonusHeroi(1, e)).toBeGreaterThan(bonusHeroi(1, 'intendente'));
    }
  });

  it('em treino, ferido ou marchando não está disponível nem dá bônus', () => {
    expect(heroiDisponivel(heroi(), AGORA)).toBe(true);
    expect(heroiDisponivel(heroi({ treinoProntoEm: AGORA + 1 }), AGORA)).toBe(false);
    expect(heroiDisponivel(heroi({ feridoAte: AGORA + 1 }), AGORA)).toBe(false);
    expect(heroiDisponivel(heroi({ territorioId: null, marchaId: 'm' }), AGORA)).toBe(false);
    expect(bonusSeDisponivel(heroi({ feridoAte: AGORA + 1 }), 'comandante', AGORA)).toBe(0);
    expect(bonusSeDisponivel(heroi(), 'castelao', AGORA)).toBe(0);
    expect(bonusSeDisponivel(heroi(), 'comandante', AGORA)).toBeCloseTo(bonusHeroi(5, 'comandante'));
  });

  it('comandante e castelão mudam a força da batalha', () => {
    const base = { atacante: exercito({ lanceiro: 20 }), defensor: exercito({ lanceiro: 20 }), terreno: 'planicie' as const, nivelMuralha: 0, sorte: 0, alvoCidadePrincipal: false };
    const sem = resolverBatalha(base);
    expect(resolverBatalha({ ...base, bonusAtaque: 0.2 }).forcaAtaque).toBeCloseTo(sem.forcaAtaque * 1.2);
    expect(resolverBatalha({ ...base, bonusDefesa: 0.2 }).forcaDefesa).toBeCloseTo(sem.forcaDefesa * 1.2);
  });

  it('desbravador encurta a marcha; saqueador carrega mais', () => {
    const tropas = exercito({ lanceiro: 10 });
    const [a, b] = [{ x: 0, y: 0 }, { x: 100, y: 0 }];
    expect(duracaoMarchaMs(a, b, tropas, 0.2)).toBeLessThan(duracaoMarchaMs(a, b, tropas));
    expect(capacidadeCarga(tropas, 0.2)).toBeCloseTo(capacidadeCarga(tropas) * 1.2);
    const estoque = recursos({ comida: 1e5, madeira: 1e5, ouro: 1e5 });
    const com = calcularSaque({ estoque, nivelArmazem: 0, sobreviventes: tropas, bonusCarga: 0.2 });
    const sem = calcularSaque({ estoque, nivelArmazem: 0, sobreviventes: tropas });
    expect(com.comida + com.madeira + com.ouro).toBeGreaterThan(sem.comida + sem.madeira + sem.ouro);
  });

  it('intendente: na cidade, tudo e crescimento; noutro território, o dobro num recurso só', () => {
    const recursoDoTerritorio = new Map([['floresta', 'madeira' as const]]);
    const b = bonusHeroi(10, 'intendente');
    const naCidade = bonusIntendente({ heroi: heroi({ especialidade: 'intendente', nivel: 10 }), cidadeTerritorioId: 'cidade', recursoDoTerritorio, agora: AGORA });
    expect(naCidade.bonusTerritorios).toEqual(recursos({ comida: b, madeira: b, ouro: b }));
    expect(naCidade.bonusCrescimento).toBeCloseTo(b);
    const fora = bonusIntendente({
      heroi: heroi({ especialidade: 'intendente', nivel: 10, territorioId: 'floresta' }),
      cidadeTerritorioId: 'cidade',
      recursoDoTerritorio,
      agora: AGORA,
    });
    expect(fora.bonusTerritorios).toEqual(recursos({ madeira: b * H.multiplicadorIntendenteTerritorio }));
    expect(fora.bonusCrescimento).toBe(0);
    expect(bonusIntendente({ heroi: heroi(), cidadeTerritorioId: 'cidade', recursoDoTerritorio, agora: AGORA }).bonusCrescimento).toBe(0);
  });

  it('o crescimento extra faz a população crescer mais rápido', () => {
    const cidade = { ...cidadeInicial(0), populacao: 1 };
    const sem = atualizarCidade({ cidade, tropas: exercito(), agora: HORA_MS });
    const com = atualizarCidade({ cidade, tropas: exercito(), agora: HORA_MS, bonusCrescimento: 0.2 });
    expect(com.cidade.populacao).toBeGreaterThan(sem.cidade.populacao);
  });
});
