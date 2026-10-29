import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { capacidadeArmazem } from './predios.ts';
import {
  atualizarCidade,
  avancarCidade,
  cidadeInicial,
  consumoComidaHora,
  habitantesLivres,
  producaoHora,
  verificarAlocacao,
} from './producao.ts';
import type { EstadoCidade, Exercito } from './tipos.ts';
import { HORA_MS, exercito, recursos, totalUnidades } from './util.ts';

const INICIO = Date.UTC(2026, 10, 1);

function cidadeProdutora(mudancas: Partial<EstadoCidade> = {}): EstadoCidade {
  return {
    ...cidadeInicial(INICIO),
    populacao: 30,
    predios: { centro: 3, casa: 2, fazenda: 2, serraria: 2, mercado: 1, armazem: 2, quartel: 1, muralha: 0 },
    trabalhadores: { comida: 10, madeira: 8, ouro: 3 },
    recursos: { comida: 100, madeira: 100, ouro: 50 },
    ...mudancas,
  };
}

/** Atualiza a cidade em `passos` iguais até `horas` depois do início. */
function atualizarEmPassos(cidade: EstadoCidade, tropas: Exercito, horas: number, passos: number) {
  let estado = { cidade, tropas };
  for (let i = 1; i <= passos; i++) {
    estado = atualizarCidade({ ...estado, agora: INICIO + (horas * HORA_MS * i) / passos });
  }
  return estado;
}

describe('producaoHora', () => {
  it('multiplica trabalhadores, taxa, nível e bônus de território', () => {
    const p = producaoHora(cidadeProdutora(), recursos({ comida: 0.1 }));
    // 10 trabalhadores × 12 × (1 + 0,1 × 1 nível extra) × 1,1 de bônus
    expect(p.comida).toBeCloseTo(10 * 12 * 1.1 * 1.1);
    expect(p.madeira).toBeCloseTo(8 * 10 * 1.1);
    expect(p.ouro).toBeCloseTo(3 * 4);
  });

  it('ignora trabalhadores acima das vagas e prédios não construídos', () => {
    const cidade = cidadeProdutora({
      predios: { centro: 1, casa: 0, fazenda: 1, serraria: 0, mercado: 0, armazem: 0, quartel: 0, muralha: 0 },
      trabalhadores: { comida: 50, madeira: 5, ouro: 5 },
    });
    const p = producaoHora(cidade);
    expect(p.comida).toBe(5 * 12);
    expect(p.madeira).toBe(0);
    expect(p.ouro).toBe(0);
  });
});

describe('atualizarCidade', () => {
  it('soma a produção pelo tempo decorrido', () => {
    const cidade = cidadeProdutora();
    const { cidade: depois } = atualizarCidade({ cidade, tropas: exercito(), agora: INICIO + 2 * HORA_MS });
    const p = producaoHora(cidade);
    expect(depois.recursos.madeira).toBeCloseTo(100 + 2 * p.madeira);
    expect(depois.recursos.ouro).toBeCloseTo(50 + 2 * p.ouro);
    expect(depois.atualizadoEm).toBe(INICIO + 2 * HORA_MS);
  });

  it('dá o mesmo resultado atualizando de hora em hora ou de uma vez', () => {
    const cidade = cidadeProdutora();
    const tropas = exercito({ lanceiro: 20, cavalaria: 5 });
    const deUmaVez = atualizarEmPassos(cidade, tropas, 30, 1);
    const hora = atualizarEmPassos(cidade, tropas, 30, 30);
    for (const r of ['comida', 'madeira', 'ouro'] as const) {
      expect(hora.cidade.recursos[r]).toBeCloseTo(deUmaVez.cidade.recursos[r], 6);
    }
    expect(hora.cidade.populacao).toBeCloseTo(deUmaVez.cidade.populacao, 6);
  });

  it('nunca passa da capacidade do armazém, mas não destrói estoque acima dela', () => {
    const teto = capacidadeArmazem(2);
    const { cidade } = atualizarCidade({ cidade: cidadeProdutora(), tropas: exercito(), agora: INICIO + 1000 * HORA_MS });
    expect(cidade.recursos.madeira).toBe(teto);

    const cheia = cidadeProdutora({ recursos: { comida: 0, madeira: teto + 500, ouro: 0 } });
    const { cidade: depois } = atualizarCidade({ cidade: cheia, tropas: exercito(), agora: INICIO + HORA_MS });
    expect(depois.recursos.madeira).toBe(teto + 500);
  });

  it('desconta a comida das tropas', () => {
    const cidade = cidadeProdutora({ trabalhadores: { comida: 0, madeira: 0, ouro: 0 }, recursos: recursos({ comida: 500 }) });
    const tropas = exercito({ lanceiro: 10, cavalaria: 5 }); // 10 × 1 + 5 × 2 = 20 por hora
    const { cidade: depois, desertores } = atualizarCidade({ cidade, tropas, agora: INICIO + 10 * HORA_MS });
    expect(depois.recursos.comida).toBeCloseTo(300);
    expect(totalUnidades(desertores)).toBe(0);
  });

  it('faz tropas desertarem aos poucos quando a comida acaba, até o que a produção sustenta', () => {
    const cidade = cidadeProdutora({
      populacao: 150,
      trabalhadores: { comida: 5, madeira: 0, ouro: 0 }, // 5 × 12 × 1,1 = 66 de comida por hora
      recursos: recursos({ comida: 0 }),
    });
    const tropas = exercito({ lanceiro: 100 }); // comem 100 por hora
    const consumo = consumoComidaHora(tropas);
    const sustentavel = (producaoHora(cidade).comida / consumo) * 100;

    const umaHora = atualizarCidade({ cidade, tropas, agora: INICIO + HORA_MS });
    expect(umaHora.desertores.lanceiro).toBeGreaterThan(0);
    expect(umaHora.desertores.lanceiro).toBeLessThan(10); // gradual, não em massa
    // População acima do limite das casas não cresce; quem deserta sai da população.
    expect(umaHora.cidade.populacao).toBe(150 - umaHora.desertores.lanceiro);

    const muitoTempo = atualizarCidade({ cidade, tropas, agora: INICIO + 500 * HORA_MS });
    expect(muitoTempo.tropas.lanceiro).toBeCloseTo(sustentavel, 0);
    expect(muitoTempo.cidade.recursos.comida).toBe(0);
  });

  it('a deserção em passos fica perto da deserção de uma vez (só arredondamento)', () => {
    const cidade = cidadeProdutora({ populacao: 150, trabalhadores: { comida: 5, madeira: 0, ouro: 0 }, recursos: recursos({ comida: 200 }) });
    const tropas = exercito({ lanceiro: 80, arqueiro: 40 });
    const deUmaVez = atualizarEmPassos(cidade, tropas, 24, 1);
    const hora = atualizarEmPassos(cidade, tropas, 24, 24);
    expect(Math.abs(hora.tropas.lanceiro - deUmaVez.tropas.lanceiro)).toBeLessThanOrEqual(3);
    expect(Math.abs(hora.tropas.arqueiro - deUmaVez.tropas.arqueiro)).toBeLessThanOrEqual(3);
  });

  it('cresce a população até o limite das casas', () => {
    const cidade = cidadeProdutora({ populacao: 10 });
    const { cidade: depois } = atualizarCidade({ cidade, tropas: exercito(), agora: INICIO + 1000 * HORA_MS });
    expect(depois.populacao).toBe(BALANCEAMENTO.populacao.limiteBase + 2 * BALANCEAMENTO.populacao.limitePorNivelCasa);
  });

  it('não volta no tempo se `agora` for anterior a atualizadoEm', () => {
    const cidade = cidadeProdutora();
    const { cidade: depois } = atualizarCidade({ cidade, tropas: exercito(), agora: INICIO - HORA_MS });
    expect(depois).toEqual(cidade);
  });
});

describe('avancarCidade', () => {
  const semFazenda = (): EstadoCidade =>
    cidadeProdutora({
      predios: { centro: 2, casa: 1, fazenda: 0, serraria: 0, mercado: 0, armazem: 0, quartel: 0, muralha: 0 },
      trabalhadores: { comida: 5, madeira: 0, ouro: 0 },
      recursos: recursos({ comida: 0 }),
    });

  it('sem obra, é igual a atualizarCidade', () => {
    const cidade = cidadeProdutora();
    const agora = INICIO + 3 * HORA_MS;
    const r = avancarCidade({ cidade, tropas: exercito(), agora });
    expect(r.cidade).toEqual(atualizarCidade({ cidade, tropas: exercito(), agora }).cidade);
    expect(r.obrasConcluidas).toEqual([]);
  });

  it('mantém a obra que ainda não terminou', () => {
    const obra = { tipo: 'fazenda' as const, prontoEm: INICIO + 5 * HORA_MS };
    const r = avancarCidade({ cidade: semFazenda(), tropas: exercito(), obras: [obra], agora: INICIO + HORA_MS });
    expect(r.obras).toEqual([obra]);
    expect(r.cidade.predios.fazenda).toBe(0);
  });

  it('conclui a obra no meio do intervalo e só produz a partir dali', () => {
    // A fazenda fica pronta 1 h depois do início; 3 h depois, produziu por 2 h.
    const obra = { tipo: 'fazenda' as const, prontoEm: INICIO + HORA_MS };
    const r = avancarCidade({ cidade: semFazenda(), tropas: exercito(), obras: [obra], agora: INICIO + 3 * HORA_MS });
    expect(r.obrasConcluidas).toEqual([obra]);
    expect(r.obras).toEqual([]);
    expect(r.cidade.predios.fazenda).toBe(1);
    expect(r.cidade.recursos.comida).toBeCloseTo(2 * 5 * BALANCEAMENTO.producao.porTrabalhadorHora.comida);
    expect(r.cidade.atualizadoEm).toBe(INICIO + 3 * HORA_MS);
  });

  it('dá o mesmo resultado se o servidor atualizar no meio da obra', () => {
    const obra = { tipo: 'fazenda' as const, prontoEm: INICIO + 2 * HORA_MS };
    const deUmaVez = avancarCidade({ cidade: semFazenda(), tropas: exercito(), obras: [obra], agora: INICIO + 5 * HORA_MS });
    const meio = avancarCidade({ cidade: semFazenda(), tropas: exercito(), obras: [obra], agora: INICIO + HORA_MS });
    const fim = avancarCidade({ cidade: meio.cidade, tropas: meio.tropas, obras: meio.obras, agora: INICIO + 5 * HORA_MS });
    expect(fim.cidade.recursos.comida).toBeCloseTo(deUmaVez.cidade.recursos.comida, 6);
    expect(fim.cidade.predios).toEqual(deUmaVez.cidade.predios);
  });
});

describe('avancarCidade com treino', () => {
  // Cidade sem produção de comida, com estoque para 10 h de 10 lanceiros.
  const semComida = (): EstadoCidade =>
    cidadeProdutora({ populacao: 100, trabalhadores: { comida: 0, madeira: 0, ouro: 0 }, recursos: recursos({ comida: 100 }) });

  it('tropas de um lote concluído entram no exército e passam a comer a partir dali', () => {
    const lote = { tipo: 'lanceiro' as const, quantidade: 10, prontoEm: INICIO + 2 * HORA_MS };
    const r = avancarCidade({ cidade: semComida(), tropas: exercito(), treinos: [lote], agora: INICIO + 5 * HORA_MS });
    expect(r.tropas.lanceiro).toBe(10);
    expect(r.lotesConcluidos).toEqual([lote]);
    expect(r.treinos).toEqual([]);
    // Comeram só nas 3 horas depois de prontos: 10 × 1 × 3.
    expect(r.cidade.recursos.comida).toBeCloseTo(70);
  });

  it('lotes ainda em treino ficam na fila e não comem', () => {
    const lote = { tipo: 'cavalaria' as const, quantidade: 4, prontoEm: INICIO + 9 * HORA_MS };
    const r = avancarCidade({ cidade: semComida(), tropas: exercito(), treinos: [lote], agora: INICIO + 5 * HORA_MS });
    expect(r.tropas.cavalaria).toBe(0);
    expect(r.treinos).toEqual([lote]);
    expect(r.cidade.recursos.comida).toBe(100);
  });

  it('aplica obra e lotes na ordem em que terminam', () => {
    const cidade = cidadeProdutora({
      predios: { centro: 2, casa: 1, fazenda: 0, serraria: 0, mercado: 0, armazem: 0, quartel: 1, muralha: 0 },
      trabalhadores: { comida: 5, madeira: 0, ouro: 0 },
      recursos: recursos({ comida: 0 }),
      populacao: 100,
    });
    const r = avancarCidade({
      cidade,
      tropas: exercito(),
      obras: [{ tipo: 'fazenda', prontoEm: INICIO + HORA_MS }],
      treinos: [{ tipo: 'lanceiro', quantidade: 20, prontoEm: INICIO + 2 * HORA_MS }],
      agora: INICIO + 3 * HORA_MS,
    });
    // Fazenda produz 60/h desde 1 h; lanceiros comem 20/h desde 2 h: 2 × 60 − 1 × 20.
    expect(r.cidade.recursos.comida).toBeCloseTo(100);
    expect(r.obrasConcluidas).toHaveLength(1);
    expect(r.tropas.lanceiro).toBe(20);
  });

  it('conclui várias obras da fila em sequência, cada uma no seu tempo', () => {
    // Fazenda pronta em 1 h e evoluída de novo em 2 h: produz 60/h por 1 h e 66/h por 1 h.
    const cidade = cidadeProdutora({
      predios: { centro: 3, casa: 1, fazenda: 0, serraria: 0, mercado: 0, armazem: 0, quartel: 0, muralha: 0 },
      trabalhadores: { comida: 5, madeira: 0, ouro: 0 },
      recursos: recursos({ comida: 0 }),
    });
    const r = avancarCidade({
      cidade,
      tropas: exercito(),
      obras: [
        { tipo: 'fazenda', prontoEm: INICIO + HORA_MS },
        { tipo: 'fazenda', prontoEm: INICIO + 2 * HORA_MS },
        { tipo: 'casa', prontoEm: INICIO + 9 * HORA_MS },
      ],
      agora: INICIO + 3 * HORA_MS,
    });
    expect(r.cidade.predios.fazenda).toBe(2);
    expect(r.obras).toEqual([{ tipo: 'casa', prontoEm: INICIO + 9 * HORA_MS }]);
    expect(r.cidade.recursos.comida).toBeCloseTo(60 + 66);
  });
});

describe('alocação de trabalhadores', () => {
  const cidade = cidadeProdutora({ populacao: 30.7 });

  it('aceita uma alocação dentro das vagas e da população', () => {
    expect(verificarAlocacao({ cidade, alocacao: { comida: 10, madeira: 10, ouro: 5 }, soldados: 5 }).ok).toBe(true);
  });

  it('recusa mais trabalhadores que vagas', () => {
    expect(verificarAlocacao({ cidade, alocacao: { comida: 11, madeira: 0, ouro: 0 }, soldados: 0 })).toEqual({
      ok: false,
      motivo: 'acima_das_vagas',
    });
  });

  it('recusa quando trabalhadores e soldados passam da população', () => {
    expect(verificarAlocacao({ cidade, alocacao: { comida: 10, madeira: 10, ouro: 5 }, soldados: 6 })).toEqual({
      ok: false,
      motivo: 'populacao_insuficiente',
    });
  });

  it('recusa valores negativos ou fracionários', () => {
    expect(verificarAlocacao({ cidade, alocacao: { comida: -1, madeira: 0, ouro: 0 }, soldados: 0 }).ok).toBe(false);
    expect(verificarAlocacao({ cidade, alocacao: { comida: 1.5, madeira: 0, ouro: 0 }, soldados: 0 }).ok).toBe(false);
  });

  it('conta habitantes livres arredondando a população para baixo', () => {
    expect(habitantesLivres(cidade, 4)).toBe(30 - 21 - 4);
  });
});
