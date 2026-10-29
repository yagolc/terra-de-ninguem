import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from '../balanceamento.ts';
import { BONUS_DO_TERRENO, distanciasNoGrafo, grafoDeFronteiras } from '../territorios.ts';
import { totalUnidades } from '../util.ts';
import { avaliarMapa, escolherMelhorMapa, gerarMapa, totalDeTerritorios, type MapaGerado } from './gerador.ts';

// 200 mapas: 40 sementes para cada quantidade de jogadores de 2 a 6.
const MAPAS: MapaGerado[] = [];
for (let jogadores = 2; jogadores <= 6; jogadores++) {
  for (let s = 1; s <= 40; s++) MAPAS.push(gerarMapa({ semente: s * 104729 + jogadores, jogadores }));
}

describe('gerarMapa', () => {
  it('a mesma semente sempre gera o mesmo mapa', () => {
    expect(gerarMapa({ semente: 99, jogadores: 4 })).toEqual(gerarMapa({ semente: 99, jogadores: 4 }));
    expect(gerarMapa({ semente: 99, jogadores: 4 })).not.toEqual(gerarMapa({ semente: 100, jogadores: 4 }));
  });

  it('tem 4 territórios por jogador mais 6 e de 5 a 6 regiões (24 a 30 com 6 jogadores)', () => {
    for (const mapa of MAPAS) {
      const jogadores = mapa.iniciais.length;
      expect(mapa.territorios).toHaveLength(totalDeTerritorios(jogadores));
      expect(mapa.regioes.length).toBe(mapa.territorios.length >= BALANCEAMENTO.mapa.territoriosPara6Regioes ? 6 : 5);
    }
    expect(totalDeTerritorios(6)).toBe(30);
  });

  it('o mapa é todo conectado e as fronteiras não se repetem', () => {
    for (const mapa of MAPAS) {
      const grafo = grafoDeFronteiras(mapa.fronteiras);
      expect(distanciasNoGrafo(grafo, [0]).size).toBe(mapa.territorios.length);
      const chaves = mapa.fronteiras.map(([a, b]) => {
        expect(a).toBeLessThan(b);
        return `${a}-${b}`;
      });
      expect(new Set(chaves).size).toBe(chaves.length);
    }
  });

  it('cada região é um bloco contínuo e de tamanho parecido com as outras', () => {
    for (const mapa of MAPAS) {
      const tamanhos = mapa.regioes.map((r) => {
        const membros = mapa.territorios.filter((t) => t.regiao === r.indice).map((t) => t.indice);
        const dentro = mapa.fronteiras.filter(([a, b]) => membros.includes(a) && membros.includes(b));
        expect(distanciasNoGrafo(grafoDeFronteiras(dentro), [membros[0]!]).size || 1).toBe(membros.length);
        return membros.length;
      });
      expect(Math.min(...tamanhos)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...tamanhos) - Math.min(...tamanhos)).toBeLessThanOrEqual(3);
    }
  });

  it('cidades iniciais são distintas e nunca vizinhas', () => {
    for (const mapa of MAPAS) {
      expect(new Set(mapa.iniciais).size).toBe(mapa.iniciais.length);
      expect(avaliarMapa(mapa).menorDistanciaEntreCidades).toBeGreaterThanOrEqual(2);
    }
  });

  it('nomes são únicos; formatos ficam dentro do mapa; bônus segue o terreno', () => {
    for (const mapa of MAPAS) {
      expect(new Set(mapa.territorios.map((t) => t.nome)).size).toBe(mapa.territorios.length);
      expect(new Set(mapa.regioes.map((r) => r.nome)).size).toBe(mapa.regioes.length);
      for (const t of mapa.territorios) {
        expect(t.poligono.length).toBeGreaterThanOrEqual(3);
        for (const [x, y] of t.poligono) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(mapa.largura);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(mapa.altura);
        }
        expect(t.bonus).toBe(BONUS_DO_TERRENO[t.terreno]);
      }
    }
  });

  it('territórios neutros têm guarnição bárbara; os iniciais não', () => {
    for (const mapa of MAPAS) {
      for (const t of mapa.territorios) {
        if (mapa.iniciais.includes(t.indice)) expect(totalUnidades(t.guarnicao)).toBe(0);
        else expect(totalUnidades(t.guarnicao)).toBeGreaterThan(0);
      }
    }
  });

  it('recusa quantidade de jogadores fora de 1 a 6', () => {
    expect(() => gerarMapa({ semente: 1, jogadores: 7 })).toThrow(RangeError);
    expect(() => gerarMapa({ semente: 1, jogadores: 0 })).toThrow(RangeError);
  });
});

describe('escolherMelhorMapa', () => {
  it('fica com um mapa pelo menos tão justo quanto a primeira tentativa', () => {
    const primeira = avaliarMapa(gerarMapa({ semente: 555, jogadores: 6 }));
    const { avaliacao } = escolherMelhorMapa({ sementeBase: 555, jogadores: 6, tentativas: 10 });
    expect(avaliacao.menorDistanciaEntreCidades).toBeGreaterThanOrEqual(primeira.menorDistanciaEntreCidades);
    if (avaliacao.menorDistanciaEntreCidades === primeira.menorDistanciaEntreCidades) {
      expect(avaliacao.desequilibrio).toBeLessThanOrEqual(primeira.desequilibrio);
    }
  });
});
