import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  capacidadeArmazem,
  custoEvolucao,
  limitePopulacao,
  nivelArmazemNecessario,
  nivelMaximoPeloCentro,
  niveisProjetados,
  prediosIniciais,
  protecaoArmazem,
  recursosQueFaltam,
  tempoEvolucaoMs,
  verificarEvolucao,
} from './predios.ts';
import { RECURSOS, TIPOS_PREDIO, type Obra } from './tipos.ts';
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

  it('todo nível de todo prédio cabe em algum armazém até o nível máximo', () => {
    for (const tipo of TIPOS_PREDIO) {
      for (let nivel = 1; nivel <= BALANCEAMENTO.predios[tipo].nivelMaximo; nivel++) {
        const custo = custoEvolucao(tipo, nivel);
        for (const r of RECURSOS) expect(nivelArmazemNecessario(custo[r]), `${tipo} ${nivel} ${r}`).not.toBeNull();
      }
    }
  });

  it('nivelArmazemNecessario devolve o menor nível que guarda a quantidade', () => {
    expect(nivelArmazemNecessario(0)).toBe(0);
    expect(nivelArmazemNecessario(capacidadeArmazem(3))).toBe(3);
    expect(nivelArmazemNecessario(capacidadeArmazem(3) + 1)).toBe(4);
    expect(nivelArmazemNecessario(capacidadeArmazem(BALANCEAMENTO.predios.armazem.nivelMaximo) + 1)).toBeNull();
  });

  it('as casas aumentam o limite de população', () => {
    expect(limitePopulacao(0)).toBe(BALANCEAMENTO.populacao.limiteBase);
    expect(limitePopulacao(4)).toBeGreaterThan(limitePopulacao(3));
  });
});

describe('nenhum prédio fica travado pelo armazém (relato de 18/11/2026)', () => {
  it('o Armazém pode ficar um nível acima do Centro; os outros param no nível dele', () => {
    const acima = BALANCEAMENTO.armazem.niveisAcimaDoCentro;
    expect(nivelMaximoPeloCentro('armazem', 9)).toBe(9 + acima);
    expect(nivelMaximoPeloCentro('casa', 9)).toBe(9);
    expect(nivelMaximoPeloCentro('centro', 1)).toBe(BALANCEAMENTO.predios.centro.nivelMaximo);
    const predios = { ...prediosIniciais(), centro: 9, armazem: 9 };
    const tudo = { comida: 1e6, madeira: 1e6, ouro: 1e6 };
    expect(verificarEvolucao({ predios, tipo: 'armazem', recursos: tudo, obras: [], agora: 0 }).ok).toBe(acima >= 1);
    // Com o Centro 8, o Armazém já no 8 + acima não sobe mais.
    const centro8 = { ...prediosIniciais(), centro: 8, armazem: 8 + acima };
    expect(verificarEvolucao({ predios: centro8, tipo: 'armazem', recursos: tudo, obras: [], agora: 0 })).toEqual({
      ok: false,
      motivo: 'acima_do_centro',
    });
  });

  it('todo nível de todo prédio cabe no maior Armazém que dá para ter quando ele é construído', () => {
    const maximoArmazem = BALANCEAMENTO.predios.armazem.nivelMaximo;
    for (const tipo of TIPOS_PREDIO) {
      for (let n = 1; n <= BALANCEAMENTO.predios[tipo].nivelMaximo; n++) {
        const custo = custoEvolucao(tipo, n);
        const maior = Math.max(...RECURSOS.map((r) => custo[r]));
        // Construindo o nível n: o Centro está no máximo permitido (o próprio Centro, ainda em n − 1), e o Armazém no
        // maior nível que esse Centro deixa (o próprio Armazém, ainda em n − 1).
        const centro = tipo === 'centro' ? n - 1 : BALANCEAMENTO.predios.centro.nivelMaximo;
        const armazem = tipo === 'armazem' ? n - 1 : Math.min(maximoArmazem, nivelMaximoPeloCentro('armazem', centro));
        expect(maior, `${tipo} ${n} custa ${maior} e o Armazém possível (${armazem}) guarda ${capacidadeArmazem(armazem)}`).toBeLessThanOrEqual(
          capacidadeArmazem(armazem),
        );
      }
    }
  });
});
