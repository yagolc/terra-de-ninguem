// Gerador do mapa de uma temporada. Determinístico: a mesma semente sempre gera o mesmo mapa.
// Fica fora do index.ts das regras porque depende do d3-delaunay (as Edge Functions não precisam dele).
import { Delaunay } from 'd3-delaunay';
import { geradorComSemente } from '../aleatorio.ts';
import { BALANCEAMENTO } from '../balanceamento.ts';
import { BONUS_DO_TERRENO, distanciasNoGrafo, grafoDeFronteiras } from '../territorios.ts';
import { TERRENOS, TIPOS_UNIDADE, type Exercito, type Recurso, type Terreno } from '../tipos.ts';
import { exercito } from '../util.ts';
import { DIRECOES, NOMES_REGIOES, NOMES_TERRITORIOS } from './nomes.ts';

export type Ponto2 = [number, number];

export type RegiaoGerada = { indice: number; nome: string; terreno: Terreno };

export type TerritorioGerado = {
  indice: number;
  nome: string;
  regiao: number;
  terreno: Terreno;
  bonus: Recurso;
  /** Centro do território, em léguas. */
  x: number;
  y: number;
  /** Contorno do território (sem repetir o primeiro ponto no fim), em léguas. */
  poligono: Ponto2[];
  /** Tropas bárbaras do território neutro; vazio nos territórios iniciais. */
  guarnicao: Exercito;
};

export type MapaGerado = {
  semente: number;
  largura: number;
  altura: number;
  regioes: RegiaoGerada[];
  territorios: TerritorioGerado[];
  /** Pares de territórios vizinhos, com o menor índice primeiro. */
  fronteiras: [number, number][];
  /** Território inicial de cada jogador, na ordem dos jogadores. */
  iniciais: number[];
};

export type AvaliacaoMapa = {
  /** Menor número de fronteiras entre duas cidades iniciais. */
  menorDistanciaEntreCidades: number;
  /** Territórios mais próximos de cada cidade que de qualquer outra (empates divididos). */
  areas: number[];
  /** Maior área menos a menor: quanto menor, mais justo. */
  desequilibrio: number;
};

type Aleatorio = () => number;

const arredondar = (valor: number) => Math.round(valor * 100) / 100;

function embaralhar<T>(aleatorio: Aleatorio, lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(aleatorio() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

function sortearComPeso<T extends string>(aleatorio: Aleatorio, pesos: Readonly<Record<T, number>>): T {
  const opcoes = Object.entries(pesos) as [T, number][];
  let sorteio = aleatorio() * opcoes.reduce((soma, [, peso]) => soma + peso, 0);
  for (const [opcao, peso] of opcoes) {
    sorteio -= peso;
    if (sorteio < 0) return opcao;
  }
  return opcoes[opcoes.length - 1]![0];
}

function centroide(poligono: readonly Ponto2[]): Ponto2 {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poligono.length; i++) {
    const [x0, y0] = poligono[i]!;
    const [x1, y1] = poligono[(i + 1) % poligono.length]!;
    const cruz = x0 * y1 - x1 * y0;
    area += cruz;
    cx += (x0 + x1) * cruz;
    cy += (y0 + y1) * cruz;
  }
  return [cx / (3 * area), cy / (3 * area)];
}

/** Pontos aleatórios espalhados por igual (relaxamento de Lloyd) e o Voronoi final. */
function diagramaRelaxado(aleatorio: Aleatorio, total: number, largura: number, altura: number) {
  let pontos: Ponto2[] = Array.from({ length: total }, () => [aleatorio() * largura, aleatorio() * altura]);
  for (let rodada = 0; rodada < 4; rodada++) {
    const voronoi = Delaunay.from(pontos).voronoi([0, 0, largura, altura]);
    pontos = pontos.map((ponto, i) => {
      const celula = voronoi.cellPolygon(i);
      return celula ? centroide(celula.slice(0, -1) as Ponto2[]) : ponto;
    });
  }
  return { pontos, voronoi: Delaunay.from(pontos).voronoi([0, 0, largura, altura]) };
}

/** Divide os territórios em regiões contínuas e de tamanho parecido, crescendo a partir de sementes afastadas. */
function dividirEmRegioes(aleatorio: Aleatorio, grafo: Map<number, number[]>, total: number, quantas: number): number[] {
  const sementes = [Math.floor(aleatorio() * total)];
  while (sementes.length < quantas) {
    const distancia = distanciasNoGrafo(grafo, sementes);
    let melhor = 0;
    for (let i = 1; i < total; i++) if ((distancia.get(i) ?? 0) > (distancia.get(melhor) ?? 0)) melhor = i;
    sementes.push(melhor);
  }

  const regiao = new Array<number>(total).fill(-1);
  const tamanho = new Array<number>(quantas).fill(1);
  sementes.forEach((s, r) => (regiao[s] = r));

  for (let restantes = total - quantas; restantes > 0; restantes--) {
    // A menor região que ainda pode crescer pega um vizinho livre ao acaso.
    const ordem = [...Array(quantas).keys()].sort((a, b) => tamanho[a]! - tamanho[b]! || a - b);
    for (const r of ordem) {
      const borda = [...Array(total).keys()].filter(
        (i) => regiao[i] === -1 && (grafo.get(i) ?? []).some((v) => regiao[v] === r),
      );
      if (borda.length === 0) continue;
      const escolhido = borda[Math.floor(aleatorio() * borda.length)]!;
      regiao[escolhido] = r;
      tamanho[r]!++;
      break;
    }
  }
  equilibrarRegioes(grafo, regiao, tamanho);
  return regiao;
}

/** A região continua um bloco só se tirarmos `sem` dela? */
function continuaConexa(grafo: Map<number, number[]>, regiao: number[], r: number, sem: number): boolean {
  const membros = regiao.flatMap((reg, i) => (reg === r && i !== sem ? [i] : []));
  if (membros.length === 0) return false;
  const visitados = new Set([membros[0]!]);
  const fila = [membros[0]!];
  while (fila.length > 0) {
    for (const v of grafo.get(fila.pop()!) ?? []) {
      if (v !== sem && regiao[v] === r && !visitados.has(v)) {
        visitados.add(v);
        fila.push(v);
      }
    }
  }
  return visitados.size === membros.length;
}

/**
 * Regiões presas entre outras param de crescer cedo. Aqui as menores recebem territórios da borda de
 * vizinhas bem maiores, sem partir a região doadora, até a diferença ficar pequena.
 */
function equilibrarRegioes(grafo: Map<number, number[]>, regiao: number[], tamanho: number[]): void {
  for (let passo = 0; passo < regiao.length * 2; passo++) {
    if (Math.max(...tamanho) - Math.min(...tamanho) <= 2) return;
    const ordem = [...tamanho.keys()].sort((a, b) => tamanho[a]! - tamanho[b]! || a - b);
    let moveu = false;
    for (const r of ordem) {
      let melhor = -1;
      for (let t = 0; t < regiao.length; t++) {
        const doadora = regiao[t]!;
        if (doadora === r || tamanho[doadora]! < tamanho[r]! + 2) continue;
        if (!(grafo.get(t) ?? []).some((v) => regiao[v] === r)) continue;
        if (!continuaConexa(grafo, regiao, doadora, t)) continue;
        if (melhor === -1 || tamanho[doadora]! > tamanho[regiao[melhor]!]!) melhor = t;
      }
      if (melhor !== -1) {
        tamanho[regiao[melhor]!]!--;
        regiao[melhor] = r;
        tamanho[r]!++;
        moveu = true;
        break;
      }
    }
    if (!moveu) return;
  }
}

function nomearRegioes(
  centros: Ponto2[],
  terrenos: Terreno[],
  largura: number,
  altura: number,
): string[] {
  const usados = new Set<string>();
  return centros.map(([x, y], r) => {
    const dx = x - largura / 2;
    const dy = y - altura / 2;
    const perto = Math.hypot(dx, dy) < 0.15 * Math.min(largura, altura);
    const direcao = perto ? 'Centrais' : DIRECOES[(Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8]!;
    for (const palavra of NOMES_REGIOES[terrenos[r]!]) {
      const nome = `${palavra} ${direcao}`;
      if (!usados.has(nome)) {
        usados.add(nome);
        return nome;
      }
    }
    const reserva = `${NOMES_REGIOES[terrenos[r]!][0]} ${direcao} ${r + 1}`;
    usados.add(reserva);
    return reserva;
  });
}

/** Distâncias (em fronteiras) de cada cidade inicial até todos os territórios. */
function distanciasPorCidade(grafo: Map<number, number[]>, iniciais: number[]): Map<number, number>[] {
  return iniciais.map((i) => distanciasNoGrafo(grafo, [i]));
}

function avaliar(grafo: Map<number, number[]>, total: number, iniciais: number[]): AvaliacaoMapa {
  const distancias = distanciasPorCidade(grafo, iniciais);
  let menor = Infinity;
  for (let a = 0; a < iniciais.length; a++) {
    for (let b = a + 1; b < iniciais.length; b++) menor = Math.min(menor, distancias[a]!.get(iniciais[b]!) ?? Infinity);
  }

  const areas = new Array<number>(iniciais.length).fill(0);
  for (let t = 0; t < total; t++) {
    const ds = distancias.map((d) => d.get(t) ?? Infinity);
    const minimo = Math.min(...ds);
    const maisProximas = ds.flatMap((d, j) => (d === minimo ? [j] : []));
    for (const j of maisProximas) areas[j]! += 1 / maisProximas.length;
  }
  return {
    menorDistanciaEntreCidades: iniciais.length > 1 ? menor : Infinity,
    areas,
    desequilibrio: Math.max(...areas) - Math.min(...areas),
  };
}

/** Cidades iniciais o mais afastadas possível: testa cada território como primeira e afasta as seguintes. */
function escolherIniciais(grafo: Map<number, number[]>, total: number, jogadores: number): number[] {
  let melhor: { iniciais: number[]; avaliacao: AvaliacaoMapa } | null = null;
  for (let primeira = 0; primeira < total; primeira++) {
    const iniciais = [primeira];
    while (iniciais.length < jogadores) {
      const distancia = distanciasNoGrafo(grafo, iniciais);
      let longe = -1;
      for (let i = 0; i < total; i++) {
        if (!iniciais.includes(i) && (longe === -1 || (distancia.get(i) ?? 0) > (distancia.get(longe) ?? 0))) longe = i;
      }
      iniciais.push(longe);
    }
    const avaliacao = avaliar(grafo, total, iniciais);
    if (
      !melhor ||
      avaliacao.menorDistanciaEntreCidades > melhor.avaliacao.menorDistanciaEntreCidades ||
      (avaliacao.menorDistanciaEntreCidades === melhor.avaliacao.menorDistanciaEntreCidades &&
        avaliacao.desequilibrio < melhor.avaliacao.desequilibrio)
    ) {
      melhor = { iniciais, avaliacao };
    }
  }
  return melhor!.iniciais;
}

function guarnicaoBarbara(aleatorio: Aleatorio, distanciaDaCidadeMaisProxima: number): Exercito {
  const { unidadesBase, unidadesPorDistancia, variacao } = BALANCEAMENTO.barbaros;
  const media = unidadesBase + unidadesPorDistancia * Math.max(0, distanciaDaCidadeMaisProxima - 1);
  const total = Math.max(1, Math.round(media * (1 + variacao * (aleatorio() * 2 - 1))));

  const pesos = TIPOS_UNIDADE.map(() => 0.2 + aleatorio());
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  const tropas = exercito();
  TIPOS_UNIDADE.forEach((tipo, i) => (tropas[tipo] = Math.floor((total * pesos[i]!) / somaPesos)));
  tropas.lanceiro += total - TIPOS_UNIDADE.reduce((soma, tipo) => soma + tropas[tipo], 0);
  return tropas;
}

export function totalDeTerritorios(jogadores: number): number {
  return BALANCEAMENTO.mapa.territoriosBase + BALANCEAMENTO.mapa.territoriosPorJogador * jogadores;
}

export function gerarMapa(entrada: { semente: number; jogadores: number }): MapaGerado {
  const { semente, jogadores } = entrada;
  if (!Number.isInteger(jogadores) || jogadores < 1 || jogadores > 6) {
    throw new RangeError('O mapa é gerado para 1 a 6 jogadores.');
  }
  const config = BALANCEAMENTO.mapa;
  const aleatorio = geradorComSemente(semente);
  const total = totalDeTerritorios(jogadores);

  // Formato dos territórios e fronteiras.
  const { pontos, voronoi } = diagramaRelaxado(aleatorio, total, config.largura, config.altura);
  const poligonos = pontos.map((_, i) => {
    const celula = voronoi.cellPolygon(i);
    if (!celula) throw new Error(`Território ${i} ficou sem formato (semente ${semente}).`);
    return (celula.slice(0, -1) as Ponto2[]).map(([x, y]): Ponto2 => [arredondar(x), arredondar(y)]);
  });
  const chaves = new Set<string>();
  const fronteiras: [number, number][] = [];
  for (let i = 0; i < total; i++) {
    for (const j of voronoi.neighbors(i)) {
      const par: [number, number] = i < j ? [i, j] : [j, i];
      const chave = par.join('-');
      if (!chaves.has(chave)) {
        chaves.add(chave);
        fronteiras.push(par);
      }
    }
  }
  fronteiras.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const grafo = grafoDeFronteiras(fronteiras);

  // Regiões, terrenos e nomes.
  const quantasRegioes = total >= config.territoriosPara6Regioes ? 6 : 5;
  const regiaoDe = dividirEmRegioes(aleatorio, grafo, total, quantasRegioes);
  const terrenoDaRegiao = embaralhar(aleatorio, [...TERRENOS, ...TERRENOS]).slice(0, quantasRegioes);
  const centrosRegioes = terrenoDaRegiao.map((_, r): Ponto2 => {
    const membros = pontos.filter((_, i) => regiaoDe[i] === r);
    return [membros.reduce((s, p) => s + p[0], 0) / membros.length, membros.reduce((s, p) => s + p[1], 0) / membros.length];
  });
  const nomesRegioes = nomearRegioes(centrosRegioes, terrenoDaRegiao, config.largura, config.altura);
  const nomesTerritorios = embaralhar(aleatorio, NOMES_TERRITORIOS);

  const terrenos = pontos.map((_, i) =>
    aleatorio() < config.chanceTerrenoDaRegiao ? terrenoDaRegiao[regiaoDe[i]!]! : sortearComPeso(aleatorio, config.pesosTerreno),
  );

  // Cidades iniciais e guarnições bárbaras.
  const iniciais = escolherIniciais(grafo, total, jogadores);
  const distanciaDasCidades = distanciasNoGrafo(grafo, iniciais);

  return {
    semente,
    largura: config.largura,
    altura: config.altura,
    regioes: terrenoDaRegiao.map((terreno, indice) => ({ indice, nome: nomesRegioes[indice]!, terreno })),
    territorios: pontos.map(([x, y], indice) => ({
      indice,
      nome: nomesTerritorios[indice]!,
      regiao: regiaoDe[indice]!,
      terreno: terrenos[indice]!,
      bonus: BONUS_DO_TERRENO[terrenos[indice]!],
      x: arredondar(x),
      y: arredondar(y),
      poligono: poligonos[indice]!,
      guarnicao: iniciais.includes(indice) ? exercito() : guarnicaoBarbara(aleatorio, distanciaDasCidades.get(indice) ?? 1),
    })),
    fronteiras,
    iniciais,
  };
}

export function avaliarMapa(mapa: MapaGerado): AvaliacaoMapa {
  return avaliar(grafoDeFronteiras(mapa.fronteiras), mapa.territorios.length, mapa.iniciais);
}

/** Gera vários mapas a partir de `sementeBase` e fica com o mais justo: cidades mais afastadas, depois áreas mais parecidas. */
export function escolherMelhorMapa(entrada: { sementeBase: number; jogadores: number; tentativas?: number }) {
  const { sementeBase, jogadores, tentativas = BALANCEAMENTO.mapa.tentativas } = entrada;
  let melhor: { mapa: MapaGerado; avaliacao: AvaliacaoMapa } | null = null;
  for (let i = 0; i < tentativas; i++) {
    const mapa = gerarMapa({ semente: (sementeBase + i * 7919) >>> 0, jogadores });
    const avaliacao = avaliarMapa(mapa);
    if (
      !melhor ||
      avaliacao.menorDistanciaEntreCidades > melhor.avaliacao.menorDistanciaEntreCidades ||
      (avaliacao.menorDistanciaEntreCidades === melhor.avaliacao.menorDistanciaEntreCidades &&
        avaliacao.desequilibrio < melhor.avaliacao.desequilibrio)
    ) {
      melhor = { mapa, avaliacao };
    }
  }
  return melhor!;
}
