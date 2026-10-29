import { describe, expect, it } from 'vitest';
import { geradorComSemente, sementeDeTexto, sortearSorte } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { forcaDefesa, resolverBatalha, type EntradaBatalha } from './batalha.ts';
import { TIPOS_UNIDADE, type Exercito } from './tipos.ts';
import { exercito, totalUnidades } from './util.ts';

function batalha(mudancas: Partial<EntradaBatalha>) {
  return resolverBatalha({
    atacante: exercito({ lanceiro: 50 }),
    defensor: exercito({ lanceiro: 50 }),
    terreno: 'planicie',
    nivelMuralha: 0,
    sorte: 0,
    alvoCidadePrincipal: false,
    ...mudancas,
  });
}

function exercitoAleatorio(gerador: () => number): Exercito {
  return exercito({
    lanceiro: Math.floor(gerador() * 200),
    arqueiro: Math.floor(gerador() * 200),
    cavalaria: Math.floor(gerador() * 100),
  });
}

describe('triângulo de vantagens', () => {
  it('lanceiros vencem cavalaria e perdem para arqueiros do mesmo tamanho', () => {
    const lanceiros = exercito({ lanceiro: 100 });
    expect(batalha({ atacante: lanceiros, defensor: exercito({ cavalaria: 100 }) }).vencedor).toBe('atacante');
    expect(batalha({ atacante: lanceiros, defensor: exercito({ arqueiro: 100 }) }).vencedor).toBe('defensor');
  });

  it('cavalaria vence arqueiros e arqueiros vencem lanceiros', () => {
    expect(batalha({ atacante: exercito({ cavalaria: 100 }), defensor: exercito({ arqueiro: 100 }) }).vencedor).toBe(
      'atacante',
    );
    expect(batalha({ atacante: exercito({ arqueiro: 100 }), defensor: exercito({ lanceiro: 100 }) }).vencedor).toBe(
      'atacante',
    );
  });
});

describe('sorte', () => {
  it('muda a força do atacante em no máximo ±10%', () => {
    const neutra = batalha({ sorte: 0 }).forcaAtaque;
    expect(batalha({ sorte: 1 }).forcaAtaque).toBeCloseTo(neutra * (1 + BALANCEAMENTO.batalha.sorteMaxima));
    expect(batalha({ sorte: -1 }).forcaAtaque).toBeCloseTo(neutra * (1 - BALANCEAMENTO.batalha.sorteMaxima));
  });

  it('valores fora de [-1, 1] são limitados', () => {
    expect(batalha({ sorte: 50 }).forcaAtaque).toBe(batalha({ sorte: 1 }).forcaAtaque);
    expect(batalha({ sorte: -50 }).forcaAtaque).toBe(batalha({ sorte: -1 }).forcaAtaque);
  });

  it('a mesma semente gera sempre a mesma batalha', () => {
    const semente = sementeDeTexto('marcha-123');
    const a = batalha({ sorte: sortearSorte(geradorComSemente(semente)) });
    const b = batalha({ sorte: sortearSorte(geradorComSemente(semente)) });
    expect(a).toEqual(b);
  });
});

describe('modificadores do defensor', () => {
  const defensor = exercito({ lanceiro: 40, arqueiro: 40 });
  const atacante = exercito({ cavalaria: 30 });
  const base = forcaDefesa(defensor, atacante, 'planicie', 0);

  it('a muralha aumenta a defesa a cada nível', () => {
    expect(forcaDefesa(defensor, atacante, 'planicie', 3)).toBeCloseTo(
      base * (1 + 3 * BALANCEAMENTO.batalha.bonusMuralhaPorNivel),
    );
  });

  it('montanha dá bônus geral de defesa', () => {
    expect(forcaDefesa(defensor, atacante, 'montanha', 0)).toBeCloseTo(base * (1 + BALANCEAMENTO.batalha.bonusMontanha));
  });

  it('floresta dá bônus só aos arqueiros', () => {
    const soLanceiros = exercito({ lanceiro: 40 });
    expect(forcaDefesa(soLanceiros, atacante, 'floresta', 0)).toBe(forcaDefesa(soLanceiros, atacante, 'planicie', 0));
    expect(forcaDefesa(defensor, atacante, 'floresta', 0)).toBeGreaterThan(base);
  });
});

describe('perdas', () => {
  it('o perdedor perde o exército e o vencedor perde menos quanto mais folgada a vitória', () => {
    const apertada = batalha({ atacante: exercito({ lanceiro: 55 }), defensor: exercito({ lanceiro: 50 }) });
    // Lanceiro: ataque 10 < defesa 15, então 55 atacantes perdem para 50 defensores.
    expect(apertada.vencedor).toBe('defensor');
    expect(apertada.sobreviventesAtacante.lanceiro).toBe(0);

    const folgada = batalha({ atacante: exercito({ cavalaria: 200 }), defensor: exercito({ arqueiro: 20 }) });
    const justa = batalha({ atacante: exercito({ lanceiro: 80 }), defensor: exercito({ lanceiro: 50 }) }); // 800 × 750
    expect(folgada.vencedor).toBe('atacante');
    expect(justa.vencedor).toBe('atacante');
    expect(totalUnidades(folgada.perdasAtacante) / 200).toBeLessThan(0.05);
    expect(totalUnidades(justa.perdasAtacante) / 80).toBeGreaterThan(0.8);
    expect(totalUnidades(justa.sobreviventesDefensor)).toBe(0);
  });

  it('em empate de força, vence o defensor', () => {
    // 3 lanceiros × 10 de ataque = 30 contra 2 lanceiros × 15 de defesa = 30.
    const empate = batalha({ atacante: exercito({ lanceiro: 3 }), defensor: exercito({ lanceiro: 2 }) });
    expect(empate.forcaAtaque).toBe(empate.forcaDefesa);
    expect(empate.vencedor).toBe('defensor');
  });

  it('território sem defensores cai sem perdas', () => {
    const r = batalha({ defensor: exercito() });
    expect(r.vencedor).toBe('atacante');
    expect(totalUnidades(r.perdasAtacante)).toBe(0);
    expect(r.margem).toBe(Number.POSITIVE_INFINITY);
  });

  it('perdas nunca são negativas nem maiores que o exército (1000 batalhas aleatórias)', () => {
    const gerador = geradorComSemente(42);
    for (let i = 0; i < 1000; i++) {
      const atacante = exercitoAleatorio(gerador);
      const defensor = exercitoAleatorio(gerador);
      const r = batalha({ atacante, defensor, sorte: sortearSorte(gerador), nivelMuralha: Math.floor(gerador() * 10) });
      for (const tipo of TIPOS_UNIDADE) {
        expect(r.perdasAtacante[tipo]).toBeGreaterThanOrEqual(0);
        expect(r.perdasAtacante[tipo]).toBeLessThanOrEqual(atacante[tipo]);
        expect(r.perdasDefensor[tipo]).toBeGreaterThanOrEqual(0);
        expect(r.perdasDefensor[tipo]).toBeLessThanOrEqual(defensor[tipo]);
        expect(r.sobreviventesAtacante[tipo] + r.perdasAtacante[tipo]).toBe(atacante[tipo]);
      }
    }
  });
});

describe('conquista', () => {
  it('exige vencer com a margem mínima', () => {
    const folgada = batalha({ atacante: exercito({ cavalaria: 200 }), defensor: exercito({ arqueiro: 20 }) });
    expect(folgada.margem).toBeGreaterThanOrEqual(BALANCEAMENTO.batalha.margemConquista);
    expect(folgada.permiteConquista).toBe(true);

    const justa = batalha({ atacante: exercito({ lanceiro: 80 }), defensor: exercito({ lanceiro: 50 }) });
    expect(justa.vencedor).toBe('atacante');
    expect(justa.permiteConquista).toBe(false);
  });

  it('a cidade principal nunca pode ser conquistada', () => {
    const r = batalha({ atacante: exercito({ cavalaria: 500 }), defensor: exercito(), alvoCidadePrincipal: true });
    expect(r.vencedor).toBe('atacante');
    expect(r.permiteConquista).toBe(false);
  });
});
