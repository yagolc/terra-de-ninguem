import { describe, expect, it } from 'vitest';
import { totalUnidades } from '../util.ts';
import { escolherMelhorMapa } from './gerador.ts';
import { linhasDoMapa } from './linhas.ts';

describe('linhasDoMapa', () => {
  const { mapa } = escolherMelhorMapa({ sementeBase: 4242, jogadores: 4, tentativas: 3 });
  let n = 0;
  const linhas = linhasDoMapa(mapa, () => `id-${String(n++).padStart(4, '0')}`);
  const ids = new Set(linhas.territorios.map((t) => t.id));

  it('tem uma linha por região e por território, com ids únicos', () => {
    expect(linhas.regioes).toHaveLength(mapa.regioes.length);
    expect(linhas.territorios).toHaveLength(mapa.territorios.length);
    expect(ids.size).toBe(mapa.territorios.length);
    const regioes = new Set(linhas.regioes.map((r) => r.id));
    expect(linhas.territorios.every((t) => regioes.has(t.regiao_id))).toBe(true);
  });

  it('marca as vagas iniciais do mapa', () => {
    expect(linhas.territorios.filter((t) => t.vaga_inicial)).toHaveLength(mapa.iniciais.length);
  });

  it('grava fronteiras e barreiras com o menor id primeiro, só entre territórios do mapa', () => {
    expect(linhas.fronteiras).toHaveLength(mapa.fronteiras.length);
    expect(linhas.barreiras).toHaveLength(mapa.barreiras.length);
    for (const f of [...linhas.fronteiras, ...linhas.barreiras]) {
      expect(ids.has(f.territorio_a) && ids.has(f.territorio_b)).toBe(true);
      expect(f.territorio_a < f.territorio_b).toBe(true);
    }
  });

  it('põe bárbaros só onde há guarnição e um povoado por território', () => {
    expect(linhas.tropas).toHaveLength(mapa.territorios.filter((t) => totalUnidades(t.guarnicao) > 0).length);
    expect(linhas.tropas.every((t) => totalUnidades(t) > 0)).toBe(true);
    expect(new Set(linhas.povoados.map((p) => p.territorio_id)).size).toBe(mapa.povoados.length);
  });
});
