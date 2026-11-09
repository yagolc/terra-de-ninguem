import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { TIPOS_MISSAO, missaoCumprida, recompensaMissao, verificarResgateMissao, type SituacaoMissoes } from './missoes.ts';
import { capacidadeArmazem, prediosIniciais } from './predios.ts';
import { RECURSOS } from './tipos.ts';

const inicio = (): SituacaoMissoes => ({
  predios: prediosIniciais(),
  soldados: 0,
  territorios: 1,
  batedores: 0,
  construcoes: 0,
  temHeroi: false,
});

/** Situação em que todas as missões estão cumpridas. */
const tudoFeito = (): SituacaoMissoes => ({
  predios: { ...prediosIniciais(), casa: 2, quartel: 1, armazem: 3 },
  soldados: 5,
  territorios: 2,
  batedores: 1,
  construcoes: 1,
  temHeroi: true,
});

describe('missões de início', () => {
  it('nenhuma vem cumprida no começo da temporada', () => {
    for (const m of TIPOS_MISSAO) expect(missaoCumprida(m, inicio())).toBe(false);
  });

  it('todas ficam cumpridas quando o jogador faz cada passo', () => {
    for (const m of TIPOS_MISSAO) expect(missaoCumprida(m, tudoFeito())).toBe(true);
  });

  it('toda missão tem recompensa, só com recursos que existem, e cabe no armazém inicial', () => {
    const teto = capacidadeArmazem(prediosIniciais().armazem);
    for (const m of TIPOS_MISSAO) {
      const r = recompensaMissao(m);
      expect(RECURSOS.some((x) => r[x] > 0)).toBe(true);
      for (const x of RECURSOS) expect(r[x]).toBeLessThanOrEqual(teto);
    }
    expect(Object.keys(BALANCEAMENTO.missoes).sort()).toEqual([...TIPOS_MISSAO].sort());
  });

  it('resgata uma vez só, e só cumprida', () => {
    const recursos = { comida: 100, madeira: 100, ouro: 100 };
    const base = { missao: 'casa_2', resgatadas: [], situacao: tudoFeito(), recursos };
    const ok = verificarResgateMissao(base);
    expect(ok).toEqual({
      ok: true,
      missao: 'casa_2',
      recursos: { comida: 100 + recompensaMissao('casa_2').comida, madeira: 100 + recompensaMissao('casa_2').madeira, ouro: 100 },
    });
    expect(verificarResgateMissao({ ...base, resgatadas: ['casa_2'] })).toEqual({ ok: false, motivo: 'ja_resgatada' });
    expect(verificarResgateMissao({ ...base, situacao: inicio() })).toEqual({ ok: false, motivo: 'nao_cumprida' });
    expect(verificarResgateMissao({ ...base, missao: 'trapaca' })).toEqual({ ok: false, motivo: 'missao_desconhecida' });
  });

  it('a recompensa não passa do armazém, nem tira o que já passou dele', () => {
    const teto = capacidadeArmazem(tudoFeito().predios.armazem);
    const r = verificarResgateMissao({
      missao: 'primeiro_territorio',
      resgatadas: [],
      situacao: tudoFeito(),
      recursos: { comida: teto - 10, madeira: teto + 50, ouro: 0 },
    });
    expect(r.ok && r.recursos).toEqual({ comida: teto, madeira: teto + 50, ouro: recompensaMissao('primeiro_territorio').ouro });
  });
});
