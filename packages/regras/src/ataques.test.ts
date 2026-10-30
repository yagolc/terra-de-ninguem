import { describe, expect, it } from 'vitest';
import { escudoAte, fimProtecaoIniciante, receberSaque, verificarAtaque, verificarMovimento } from './ataques.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import { capacidadeArmazem } from './predios.ts';
import { HORA_MS, exercito, recursos } from './util.ts';

const INICIO = Date.UTC(2026, 10, 1);
const DEPOIS_DA_PROTECAO = INICIO + 49 * HORA_MS;

function ataque(mudancas: Partial<Parameters<typeof verificarAtaque>[0]> = {}) {
  return verificarAtaque({
    tipo: 'conquista',
    enviar: exercito({ lanceiro: 10 }),
    disponiveis: exercito({ lanceiro: 20, arqueiro: 5 }),
    origemDoJogador: true,
    vizinhos: true,
    alvo: { donoId: null, cidadePrincipal: false },
    jogadorId: 'eu',
    inicioTemporada: INICIO,
    escudoDoAlvoAte: null,
    agora: DEPOIS_DA_PROTECAO,
    ...mudancas,
  });
}

describe('verificarAtaque', () => {
  it('aceita um ataque a um vizinho neutro', () => {
    expect(ataque()).toEqual({ ok: true });
  });

  it('exige origem própria e alvo vizinho', () => {
    expect(ataque({ origemDoJogador: false })).toEqual({ ok: false, motivo: 'origem_invalida' });
    expect(ataque({ vizinhos: false })).toEqual({ ok: false, motivo: 'nao_vizinho' });
    expect(ataque({ alvo: { donoId: 'eu', cidadePrincipal: false } })).toEqual({ ok: false, motivo: 'alvo_proprio' });
  });

  it('exige tropas válidas e disponíveis no território de origem', () => {
    expect(ataque({ enviar: exercito() })).toEqual({ ok: false, motivo: 'sem_tropas' });
    expect(ataque({ enviar: exercito({ lanceiro: -1, arqueiro: 2 }) })).toEqual({ ok: false, motivo: 'sem_tropas' });
    expect(ataque({ enviar: exercito({ arqueiro: 6 }) })).toEqual({ ok: false, motivo: 'tropas_insuficientes' });
  });

  it('a cidade principal pode ser saqueada, nunca conquistada', () => {
    const cidade = { donoId: 'outro', cidadePrincipal: true };
    expect(ataque({ alvo: cidade, tipo: 'conquista' })).toEqual({ ok: false, motivo: 'cidade_nao_conquistavel' });
    expect(ataque({ alvo: cidade, tipo: 'saque' }).ok).toBe(true);
  });

  it('proteção de iniciante: jogadores não, neutros sim', () => {
    const cedo = INICIO + HORA_MS;
    expect(ataque({ agora: cedo, alvo: { donoId: 'outro', cidadePrincipal: false } })).toEqual({
      ok: false,
      motivo: 'protecao_iniciante',
    });
    expect(ataque({ agora: cedo }).ok).toBe(true);
    expect(fimProtecaoIniciante(INICIO)).toBe(INICIO + BALANCEAMENTO.protecoes.inicianteHoras * HORA_MS);
  });

  it('escudo protege o jogador até o fim', () => {
    const alvo = { donoId: 'outro', cidadePrincipal: false };
    const escudo = escudoAte(DEPOIS_DA_PROTECAO - HORA_MS);
    expect(ataque({ alvo, escudoDoAlvoAte: escudo })).toEqual({ ok: false, motivo: 'alvo_com_escudo' });
    expect(ataque({ alvo, escudoDoAlvoAte: escudo, agora: escudo }).ok).toBe(true);
  });
});

describe('receberSaque', () => {
  it('soma o saque ao estoque sem passar do armazém', () => {
    const teto = capacidadeArmazem(0);
    const r = receberSaque(recursos({ comida: teto - 50, madeira: 10 }), recursos({ comida: 200, madeira: 30 }), 0);
    expect(r).toEqual({ comida: teto, madeira: 40, ouro: 0 });
  });

  it('não destrói estoque que já estava acima do armazém', () => {
    const teto = capacidadeArmazem(0);
    expect(receberSaque(recursos({ ouro: teto + 100 }), recursos({ ouro: 10 }), 0).ouro).toBe(teto + 100);
  });
});

describe('verificarMovimento', () => {
  const mover = (mudancas: Partial<Parameters<typeof verificarMovimento>[0]> = {}) =>
    verificarMovimento({
      enviar: exercito({ arqueiro: 4 }),
      disponiveis: exercito({ arqueiro: 6 }),
      origemDoJogador: true,
      destinoDoJogador: true,
      mesmoTerritorio: false,
      ligados: true,
      ...mudancas,
    });

  it('aceita mover tropas entre territórios próprios ligados', () => {
    expect(mover()).toEqual({ ok: true });
  });

  it('recusa destino alheio, o mesmo território e caminho por terra alheia', () => {
    expect(mover({ origemDoJogador: false })).toEqual({ ok: false, motivo: 'origem_invalida' });
    expect(mover({ destinoDoJogador: false })).toEqual({ ok: false, motivo: 'destino_invalido' });
    expect(mover({ mesmoTerritorio: true })).toEqual({ ok: false, motivo: 'mesmo_territorio' });
    expect(mover({ ligados: false })).toEqual({ ok: false, motivo: 'sem_caminho' });
  });

  it('exige tropas válidas e disponíveis', () => {
    expect(mover({ enviar: exercito() })).toEqual({ ok: false, motivo: 'sem_tropas' });
    expect(mover({ enviar: exercito({ arqueiro: 7 }) })).toEqual({ ok: false, motivo: 'tropas_insuficientes' });
  });
});
