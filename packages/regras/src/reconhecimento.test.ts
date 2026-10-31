import { describe, expect, it } from 'vitest';
import { geradorComSemente } from './aleatorio.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { resolverBatalha } from './batalha.ts';
import { analisarDefesa, duracaoReconhecimentoMs, verificarReconhecimento } from './reconhecimento.ts';
import { TERRENOS, TIPOS_UNIDADE } from './tipos.ts';
import { HORA_MS, MINUTO_MS, exercito } from './util.ts';

describe('verificarReconhecimento', () => {
  const base = { origemDoJogador: true, vizinhos: true, alvoProprio: false, ouro: 100 };

  it('aceita e cobra o custo em ouro', () => {
    expect(verificarReconhecimento(base)).toEqual({ ok: true, custoOuro: BALANCEAMENTO.reconhecimento.custoOuro });
  });

  it('recusa origem alheia, alvo distante, alvo próprio e falta de ouro', () => {
    expect(verificarReconhecimento({ ...base, origemDoJogador: false })).toEqual({ ok: false, motivo: 'origem_invalida' });
    expect(verificarReconhecimento({ ...base, vizinhos: false })).toEqual({ ok: false, motivo: 'nao_vizinho' });
    expect(verificarReconhecimento({ ...base, alvoProprio: true })).toEqual({ ok: false, motivo: 'alvo_proprio' });
    expect(verificarReconhecimento({ ...base, ouro: 5 })).toEqual({ ok: false, motivo: 'ouro_insuficiente' });
  });
});

describe('duracaoReconhecimentoMs', () => {
  it('anda na velocidade do batedor, com um mínimo', () => {
    const v = BALANCEAMENTO.reconhecimento.velocidade;
    expect(duracaoReconhecimentoMs({ x: 0, y: 0 }, { x: v / 2, y: 0 })).toBe(HORA_MS / 2);
    expect(duracaoReconhecimentoMs({ x: 0, y: 0 }, { x: 0.1, y: 0 })).toBe(BALANCEAMENTO.reconhecimento.duracaoMinimaMin * MINUTO_MS);
  });
});

describe('analisarDefesa', () => {
  it('território vazio cai com uma unidade de qualquer tipo', () => {
    expect(analisarDefesa({ defensor: exercito(), terreno: 'planicie', nivelMuralha: 0 })).toEqual({
      necessariosParaConquistar: exercito({ lanceiro: 1, arqueiro: 1, cavalaria: 1 }),
      melhorTipo: null,
    });
  });

  it('o triângulo aparece na recomendação: contra arqueiros, cavalaria é a melhor', () => {
    const r = analisarDefesa({ defensor: exercito({ arqueiro: 20 }), terreno: 'planicie', nivelMuralha: 0 });
    expect(r.melhorTipo).toBe('cavalaria');
  });

  it('o número sugerido conquista mesmo com o azar máximo (300 defesas aleatórias)', () => {
    const gerador = geradorComSemente(11);
    for (let i = 0; i < 300; i++) {
      const defensor = exercito({
        lanceiro: Math.floor(gerador() * 40),
        arqueiro: Math.floor(gerador() * 40),
        cavalaria: Math.floor(gerador() * 20),
      });
      const terreno = TERRENOS[Math.floor(gerador() * TERRENOS.length)]!;
      const nivelMuralha = Math.floor(gerador() * 5);
      const { necessariosParaConquistar } = analisarDefesa({ defensor, terreno, nivelMuralha });
      for (const tipo of TIPOS_UNIDADE) {
        const batalha = resolverBatalha({
          atacante: exercito({ [tipo]: necessariosParaConquistar[tipo] }),
          defensor,
          terreno,
          nivelMuralha,
          sorte: -1,
          alvoCidadePrincipal: false,
        });
        expect(batalha.permiteConquista).toBe(true);
      }
    }
  });
});
