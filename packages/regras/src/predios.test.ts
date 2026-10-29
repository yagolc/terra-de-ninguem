import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  capacidadeArmazem,
  custoEvolucao,
  limitePopulacao,
  prediosIniciais,
  protecaoArmazem,
  tempoEvolucaoMs,
  verificarEvolucao,
} from './predios.ts';
import { TIPOS_PREDIO } from './tipos.ts';
import { MINUTO_MS, recursos } from './util.ts';

const RICO = recursos({ comida: 1e9, madeira: 1e9, ouro: 1e9 });

describe('custos e tempos', () => {
  it('o nível 1 custa o custo base', () => {
    expect(custoEvolucao('fazenda', 1)).toEqual(BALANCEAMENTO.predios.fazenda.custoBase);
    expect(tempoEvolucaoMs('fazenda', 1)).toBe(BALANCEAMENTO.predios.fazenda.tempoBaseMin * MINUTO_MS);
  });

  it('cada nível custa e demora mais que o anterior', () => {
    for (const tipo of TIPOS_PREDIO) {
      for (let nivel = 2; nivel <= BALANCEAMENTO.predios[tipo].nivelMaximo; nivel++) {
        const atual = custoEvolucao(tipo, nivel);
        const anterior = custoEvolucao(tipo, nivel - 1);
        expect(atual.madeira).toBeGreaterThan(anterior.madeira);
        expect(tempoEvolucaoMs(tipo, nivel)).toBeGreaterThan(tempoEvolucaoMs(tipo, nivel - 1));
      }
    }
  });

  it('tempos são em segundos inteiros', () => {
    expect(tempoEvolucaoMs('centro', 7) % 1000).toBe(0);
  });
});

describe('verificarEvolucao', () => {
  const base = { predios: prediosIniciais(), recursos: RICO, construcaoEmAndamento: false };

  it('permite construir um prédio novo com a cidade inicial', () => {
    const r = verificarEvolucao({ ...base, tipo: 'fazenda' });
    expect(r).toMatchObject({ ok: true, nivelAlvo: 1, custo: custoEvolucao('fazenda', 1) });
  });

  it('não deixa um prédio passar do nível do Centro da Cidade', () => {
    const predios = { ...prediosIniciais(), fazenda: 1 };
    expect(verificarEvolucao({ ...base, predios, tipo: 'fazenda' })).toEqual({ ok: false, motivo: 'acima_do_centro' });
  });

  it('o próprio Centro pode subir até o nível máximo', () => {
    expect(verificarEvolucao({ ...base, tipo: 'centro' }).ok).toBe(true);
    const predios = { ...prediosIniciais(), centro: BALANCEAMENTO.predios.centro.nivelMaximo };
    expect(verificarEvolucao({ ...base, predios, tipo: 'centro' })).toEqual({ ok: false, motivo: 'nivel_maximo' });
  });

  it('só permite uma obra por vez', () => {
    expect(verificarEvolucao({ ...base, tipo: 'casa', construcaoEmAndamento: true })).toEqual({
      ok: false,
      motivo: 'construcao_em_andamento',
    });
  });

  it('exige recursos suficientes', () => {
    expect(verificarEvolucao({ ...base, tipo: 'quartel', recursos: recursos({ madeira: 10 }) })).toEqual({
      ok: false,
      motivo: 'recursos_insuficientes',
    });
  });
});

describe('armazém e casas', () => {
  it('o armazém aumenta capacidade e proteção a cada nível', () => {
    expect(capacidadeArmazem(3)).toBeGreaterThan(capacidadeArmazem(2));
    expect(protecaoArmazem(3)).toBeGreaterThan(protecaoArmazem(2));
    expect(protecaoArmazem(0)).toBeGreaterThan(0);
  });

  it('as casas aumentam o limite de população', () => {
    expect(limitePopulacao(0)).toBe(BALANCEAMENTO.populacao.limiteBase);
    expect(limitePopulacao(4)).toBeGreaterThan(limitePopulacao(3));
  });
});
