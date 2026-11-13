import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  CORES_JOGADORES,
  bonusDeTerritorios,
  distanciasNoGrafo,
  escolherCor,
  escolherTerritorioLivre,
  grafoDeFronteiras,
  alcancaOAlvo,
  ligadosPorTerritoriosProprios,
} from './territorios.ts';

// Uma linha de territórios: a - b - c - d - e
const LINHA = grafoDeFronteiras([
  ['a', 'b'],
  ['b', 'c'],
  ['c', 'd'],
  ['d', 'e'],
] as const);

describe('grafo de territórios', () => {
  it('mede a distância em fronteiras', () => {
    const d = distanciasNoGrafo(LINHA, ['a']);
    expect(d.get('a')).toBe(0);
    expect(d.get('e')).toBe(4);
  });

  it('dá ao jogador atrasado o território livre mais distante dos ocupados', () => {
    const escolhido = escolherTerritorioLivre({
      todos: ['a', 'b', 'c', 'd', 'e'],
      grafo: LINHA,
      ocupadosOuReservados: new Set(['a', 'b']),
    });
    expect(escolhido).toBe('e');
  });

  it('não escolhe nada se todos estão ocupados', () => {
    expect(escolherTerritorioLivre({ todos: ['a'], grafo: LINHA, ocupadosOuReservados: new Set(['a']) })).toBeNull();
  });

  it('soma o bônus de cada território do jogador', () => {
    const b = BALANCEAMENTO.mapa.bonusTerritorio;
    expect(bonusDeTerritorios(['comida', 'comida', 'ouro'])).toEqual({ comida: 2 * b, madeira: 0, ouro: b });
  });

  it('o entreposto multiplica o bônus do território dele', () => {
    const b = BALANCEAMENTO.mapa.bonusTerritorio;
    const m = BALANCEAMENTO.multiplicadorEntreposto;
    const r = bonusDeTerritorios(['comida', 'comida', 'ouro'], ['ouro']);
    expect(r.comida).toBeCloseTo(2 * b);
    expect(r.ouro).toBeCloseTo(b * m);
  });
});

describe('ligadosPorTerritoriosProprios', () => {
  it('liga dois territórios próprios por um caminho só de territórios próprios', () => {
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'c', proprios: new Set(['a', 'b', 'c']) })).toBe(true);
  });

  it('não atravessa território alheio', () => {
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'c', proprios: new Set(['a', 'c']) })).toBe(false);
  });

  it('origem ou destino alheio não está ligado', () => {
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'b', proprios: new Set(['a']) })).toBe(false);
  });

  it('com acesso militar, atravessa as terras de quem deu o acesso, mas não termina nelas', () => {
    const proprios = new Set(['a', 'e']);
    const corredor = new Set(['b', 'c', 'd']);
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'e', proprios, corredor })).toBe(true);
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'c', proprios, corredor })).toBe(false);
    expect(ligadosPorTerritoriosProprios({ grafo: LINHA, origem: 'a', destino: 'e', proprios, corredor: new Set(['b', 'd']) })).toBe(false);
  });
});

describe('alcancaOAlvo (acesso militar)', () => {
  // a é do jogador; b e c, de quem deu o acesso; d é o alvo; e, outro território.
  it('sem corredor, só o vizinho da origem', () => {
    const vazio = new Set<string>();
    expect(alcancaOAlvo({ grafo: LINHA, origem: 'a', alvo: 'b', proprios: new Set(['a']), corredor: vazio })).toBe(true);
    expect(alcancaOAlvo({ grafo: LINHA, origem: 'a', alvo: 'c', proprios: new Set(['a']), corredor: vazio })).toBe(false);
  });

  it('atravessa o corredor e ataca o vizinho dele', () => {
    const entrada = { grafo: LINHA, origem: 'a', proprios: new Set(['a']), corredor: new Set(['b', 'c']) };
    expect(alcancaOAlvo({ ...entrada, alvo: 'd' })).toBe(true);
    expect(alcancaOAlvo({ ...entrada, alvo: 'e' })).toBe(false);
  });

  it('o caminho pode passar por terras próprias antes do corredor, mas não por terra alheia', () => {
    expect(alcancaOAlvo({ grafo: LINHA, origem: 'a', alvo: 'e', proprios: new Set(['a', 'b']), corredor: new Set(['c', 'd']) })).toBe(true);
    expect(alcancaOAlvo({ grafo: LINHA, origem: 'a', alvo: 'e', proprios: new Set(['a']), corredor: new Set(['c', 'd']) })).toBe(false);
  });

  it('o alvo não serve de passagem e território próprio não é alvo', () => {
    expect(alcancaOAlvo({ grafo: LINHA, origem: 'a', alvo: 'b', proprios: new Set(['a', 'b']), corredor: new Set(['c']) })).toBe(false);
    expect(alcancaOAlvo({ grafo: LINHA, origem: 'a', alvo: 'd', proprios: new Set(['a']), corredor: new Set(['c']) })).toBe(false);
  });
});

describe('escolherCor', () => {
  it('dá a primeira cor livre e nunca repete enquanto houver cor livre', () => {
    expect(escolherCor([])).toBe(CORES_JOGADORES[0]);
    const usadas: string[] = [];
    for (let i = 0; i < CORES_JOGADORES.length; i++) usadas.push(escolherCor(usadas));
    expect(new Set(usadas).size).toBe(CORES_JOGADORES.length);
  });

  it('ignora jogadores sem cor e diferença de maiúsculas', () => {
    expect(escolherCor([null, CORES_JOGADORES[0].toUpperCase()])).toBe(CORES_JOGADORES[1]);
  });
});
