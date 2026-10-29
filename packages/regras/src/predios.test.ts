import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  capacidadeArmazem,
  custoEvolucao,
  limitePopulacao,
  niveisProjetados,
  prediosIniciais,
  protecaoArmazem,
  recursosQueFaltam,
  tempoEvolucaoMs,
  verificarEvolucao,
} from './predios.ts';
import { TIPOS_PREDIO, type Obra } from './tipos.ts';
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
  const base = { predios: prediosIniciais(), recursos: RICO, obras: [] as Obra[], agora: 0 };

  it('permite construir um prédio novo com a cidade inicial', () => {
    const r = verificarEvolucao({ ...base, tipo: 'fazenda' });
    expect(r).toMatchObject({
      ok: true,
      nivelAlvo: 1,
      custo: custoEvolucao('fazenda', 1),
      prontoEm: tempoEvolucaoMs('fazenda', 1),
    });
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

  it('a obra nova entra no fim da fila', () => {
    const obras: Obra[] = [{ tipo: 'fazenda', prontoEm: 500_000 }];
    const r = verificarEvolucao({ ...base, obras, tipo: 'casa', agora: 100_000 });
    expect(r).toMatchObject({ ok: true, nivelAlvo: 1, prontoEm: 500_000 + tempoEvolucaoMs('casa', 1) });
  });

  it('o mesmo prédio na fila conta para o próximo nível', () => {
    const predios = { ...prediosIniciais(), centro: 3, fazenda: 1 };
    const obras: Obra[] = [{ tipo: 'fazenda', prontoEm: 60_000 }];
    expect(verificarEvolucao({ ...base, predios, obras, tipo: 'fazenda' })).toMatchObject({ ok: true, nivelAlvo: 3 });
  });

  it('o Centro na fila libera o nível seguinte dos outros prédios', () => {
    const predios = { ...prediosIniciais(), fazenda: 1 };
    const obras: Obra[] = [{ tipo: 'centro', prontoEm: 60_000 }];
    expect(verificarEvolucao({ ...base, predios, obras, tipo: 'fazenda' })).toMatchObject({ ok: true, nivelAlvo: 2 });
  });

  it(`a fila aceita até ${BALANCEAMENTO.maxObrasNaFila} obras`, () => {
    const obras: Obra[] = Array.from({ length: BALANCEAMENTO.maxObrasNaFila }, (_, i) => ({
      tipo: 'centro',
      prontoEm: (i + 1) * 60_000,
    }));
    expect(verificarEvolucao({ ...base, obras: obras.slice(1), tipo: 'casa' }).ok).toBe(true);
    expect(verificarEvolucao({ ...base, obras, tipo: 'casa' })).toEqual({ ok: false, motivo: 'fila_cheia' });
  });

  it('exige recursos suficientes e diz quanto falta', () => {
    const estoque = recursos({ madeira: 10, ouro: 50 });
    expect(verificarEvolucao({ ...base, tipo: 'quartel', recursos: estoque })).toEqual({
      ok: false,
      motivo: 'recursos_insuficientes',
    });
    expect(recursosQueFaltam(estoque, custoEvolucao('quartel', 1))).toEqual({ comida: 0, madeira: 110, ouro: 0 });
  });

  it('projeta os níveis com as obras da fila', () => {
    const obras: Obra[] = [
      { tipo: 'casa', prontoEm: 1 },
      { tipo: 'casa', prontoEm: 2 },
    ];
    expect(niveisProjetados(prediosIniciais(), obras)).toMatchObject({ centro: 1, casa: 2 });
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
