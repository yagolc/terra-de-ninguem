import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from '../balanceamento.ts';
import { BONUS_DO_TERRENO, distanciasNoGrafo, grafoDeFronteiras } from '../territorios.ts';
import { totalUnidades } from '../util.ts';
import { quantasCidadesLivres } from '../povoados.ts';
import {
  avaliarMapa,
  escolherMelhorMapa,
  gerarMapa,
  tamanhoDoMapa,
  territoriosNaBorda,
  totalDeTerritorios,
  type MapaGerado,
} from './gerador.ts';

// 280 mapas: 40 sementes para cada quantidade de jogadores de 2 a 8.
const MAPAS: MapaGerado[] = [];
for (let jogadores = 2; jogadores <= BALANCEAMENTO.mapa.jogadoresMaximo; jogadores++) {
  for (let s = 1; s <= 40; s++) MAPAS.push(gerarMapa({ semente: s * 104729 + jogadores, jogadores }));
}

describe('gerarMapa', () => {
  it('a mesma semente sempre gera o mesmo mapa', () => {
    expect(gerarMapa({ semente: 99, jogadores: 4 })).toEqual(gerarMapa({ semente: 99, jogadores: 4 }));
    expect(gerarMapa({ semente: 99, jogadores: 4 })).not.toEqual(gerarMapa({ semente: 100, jogadores: 4 }));
  });

  it('tem 6 territórios por jogador mais 6 e de 5 a 6 regiões (42 com 6 jogadores, 54 com 8)', () => {
    for (const mapa of MAPAS) {
      const jogadores = mapa.iniciais.length;
      expect(mapa.territorios).toHaveLength(totalDeTerritorios(jogadores));
      expect(mapa.regioes.length).toBe(mapa.territorios.length >= BALANCEAMENTO.mapa.territoriosPara6Regioes ? 6 : 5);
    }
    expect(totalDeTerritorios(6)).toBe(42);
    expect(totalDeTerritorios(8)).toBe(54);
  });

  it('o mapa cresce com os territórios, e cada território fica do mesmo tamanho', () => {
    expect(tamanhoDoMapa(30)).toEqual({ largura: 60, altura: 40 });
    expect(tamanhoDoMapa(20)).toEqual({ largura: 60, altura: 40 });
    const grande = tamanhoDoMapa(totalDeTerritorios(8));
    expect((grande.largura * grande.altura) / 54).toBeCloseTo((60 * 40) / 30, 0);
    for (const mapa of MAPAS) expect({ largura: mapa.largura, altura: mapa.altura }).toEqual(tamanhoDoMapa(mapa.territorios.length));
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

  it('povoados: cidades livres longe das iniciais e não vizinhas; vilas nunca num inicial', () => {
    for (const m of MAPAS) {
      const grafo = grafoDeFronteiras(m.fronteiras);
      const livres = m.povoados.filter((p) => p.tipo === 'cidade_livre').map((p) => p.indice);
      const vilas = m.povoados.filter((p) => p.tipo === 'vila').map((p) => p.indice);
      // Um mapa cru pode ter menos cidades livres (ou nenhuma); escolherMelhorMapa fica com um que tem todas.
      expect(livres.length).toBeLessThanOrEqual(quantasCidadesLivres(m.iniciais.length));
      expect(vilas.length).toBeGreaterThan(0);
      expect(new Set(m.povoados.map((p) => p.indice)).size).toBe(m.povoados.length);
      for (const p of m.povoados) expect(m.iniciais).not.toContain(p.indice);
      for (const c of livres) {
        for (const i of m.iniciais) expect(grafo.get(i)).not.toContain(c);
      }
      for (const p of m.povoados) expect(totalUnidades(m.territorios[p.indice]!.guarnicao)).toBeGreaterThan(0);
    }
  });

  it('rios e cordilheiras: só entre regiões, nunca fronteira, sem deixar território com menos de 2 vizinhos', () => {
    for (const mapa of MAPAS) {
      const passagens = new Set(mapa.fronteiras.map(([a, b]) => `${a}-${b}`));
      const vizinhos = new Map<number, number>();
      for (const [a, b] of mapa.fronteiras) {
        vizinhos.set(a, (vizinhos.get(a) ?? 0) + 1);
        vizinhos.set(b, (vizinhos.get(b) ?? 0) + 1);
      }
      for (const { a, b, tipo } of mapa.barreiras) {
        expect(a).toBeLessThan(b);
        expect(passagens.has(`${a}-${b}`)).toBe(false);
        expect(mapa.territorios[a]!.regiao).not.toBe(mapa.territorios[b]!.regiao);
        const montanha = mapa.territorios[a]!.terreno === 'montanha' || mapa.territorios[b]!.terreno === 'montanha';
        expect(tipo).toBe(montanha ? 'montanha' : 'rio');
      }
      for (const t of mapa.territorios) expect(vizinhos.get(t.indice) ?? 0).toBeGreaterThanOrEqual(BALANCEAMENTO.mapa.barreiras.vizinhosMinimos);
    }
    expect(MAPAS.some((m) => m.barreiras.length > 0)).toBe(true);
  });

  it('as cidades iniciais encostam na borda do mapa', () => {
    for (const mapa of MAPAS) {
      const borda = territoriosNaBorda(mapa.territorios.map((t) => t.poligono), mapa.largura, mapa.altura);
      for (const i of mapa.iniciais) expect(borda.has(i)).toBe(true);
    }
  });

  it('recusa quantidade de jogadores fora de 1 a 8', () => {
    expect(() => gerarMapa({ semente: 1, jogadores: 9 })).toThrow(RangeError);
    expect(() => gerarMapa({ semente: 1, jogadores: 0 })).toThrow(RangeError);
  });
});

describe('escolherMelhorMapa', () => {
  it('fica com um mapa pelo menos tão justo quanto a primeira tentativa', () => {
    const primeiroMapa = gerarMapa({ semente: 555, jogadores: 6 });
    const primeira = avaliarMapa(primeiroMapa);
    const { mapa, avaliacao } = escolherMelhorMapa({ sementeBase: 555, jogadores: 6, tentativas: 10 });
    const livres = (m: MapaGerado) => m.povoados.filter((p) => p.tipo === 'cidade_livre').length;
    expect(livres(mapa)).toBeGreaterThanOrEqual(livres(primeiroMapa));
    if (livres(mapa) === livres(primeiroMapa)) {
      expect(avaliacao.menorDistanciaEntreCidades).toBeGreaterThanOrEqual(primeira.menorDistanciaEntreCidades);
    }
  });

  it('o mapa escolhido para a temporada tem todas as cidades livres (3 com 6 jogadores, 4 com 8)', () => {
    expect(quantasCidadesLivres(6)).toBe(3);
    expect(quantasCidadesLivres(7)).toBe(4);
    expect(quantasCidadesLivres(8)).toBe(4);
    for (const jogadores of [6, 8]) {
      for (const sementeBase of [1, 2026, 555, 9999]) {
        const { mapa } = escolherMelhorMapa({ sementeBase, jogadores });
        expect(mapa.povoados.filter((p) => p.tipo === 'cidade_livre')).toHaveLength(quantasCidadesLivres(jogadores));
      }
    }
  });
});
