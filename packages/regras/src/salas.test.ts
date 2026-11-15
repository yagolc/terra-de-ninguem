import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { sementeValida, verificarEntradaSala, verificarSala } from './salas.ts';

const SALA = {
  organizador: true,
  nome: '  Sala   Relâmpago ',
  acesso: 'aberta',
  jogadoresMaximo: 4,
  duracaoDias: 7,
  semente: 1234,
  nomesDasOutras: ['Sala principal'],
};

describe('verificarSala', () => {
  it('aceita uma sala válida e limpa o nome', () => {
    const r = verificarSala(SALA);
    expect(r).toEqual({ ok: true, sala: { nome: 'Sala Relâmpago', acesso: 'aberta', jogadoresMaximo: 4, duracaoDias: 7 }, semente: 1234 });
  });

  it('sem semente, deixa o servidor sortear', () => {
    const r = verificarSala({ ...SALA, semente: undefined });
    expect(r.ok && r.semente).toBeNull();
  });

  it('só o organizador cria', () => {
    expect(verificarSala({ ...SALA, organizador: false })).toEqual({ ok: false, motivo: 'nao_organizador' });
  });

  it('recusa nome vazio, longo ou repetido (sem contar maiúsculas e acentos)', () => {
    expect(verificarSala({ ...SALA, nome: '   ' })).toEqual({ ok: false, motivo: 'nome_vazio' });
    expect(verificarSala({ ...SALA, nome: 'x'.repeat(BALANCEAMENTO.salas.nomeMaximo + 1) })).toEqual({ ok: false, motivo: 'nome_longo' });
    expect(verificarSala({ ...SALA, nome: 'SALA PRINCIPAL' })).toEqual({ ok: false, motivo: 'nome_em_uso' });
    expect(verificarSala({ ...SALA, nome: 'Sala Relampago', nomesDasOutras: ['sala relâmpago'] })).toEqual({ ok: false, motivo: 'nome_em_uso' });
  });

  it('recusa acesso, jogadores, duração e semente fora dos limites', () => {
    expect(verificarSala({ ...SALA, acesso: 'secreta' })).toEqual({ ok: false, motivo: 'acesso_invalido' });
    expect(verificarSala({ ...SALA, jogadoresMaximo: BALANCEAMENTO.salas.jogadoresMinimo - 1 })).toEqual({ ok: false, motivo: 'jogadores_invalido' });
    expect(verificarSala({ ...SALA, jogadoresMaximo: BALANCEAMENTO.mapa.jogadoresMaximo + 1 })).toEqual({ ok: false, motivo: 'jogadores_invalido' });
    expect(verificarSala({ ...SALA, jogadoresMaximo: 3.5 })).toEqual({ ok: false, motivo: 'jogadores_invalido' });
    expect(verificarSala({ ...SALA, duracaoDias: BALANCEAMENTO.salas.duracaoMinimaDias - 1 })).toEqual({ ok: false, motivo: 'duracao_invalida' });
    expect(verificarSala({ ...SALA, duracaoDias: BALANCEAMENTO.salas.duracaoMaximaDias + 1 })).toEqual({ ok: false, motivo: 'duracao_invalida' });
    expect(verificarSala({ ...SALA, semente: -1 })).toEqual({ ok: false, motivo: 'semente_invalida' });
    expect(verificarSala({ ...SALA, semente: '12' })).toEqual({ ok: false, motivo: 'semente_invalida' });
  });
});

describe('sementeValida', () => {
  it('aceita inteiros de 0 a 999.999.999', () => {
    expect(sementeValida(0)).toBe(true);
    expect(sementeValida(999_999_999)).toBe(true);
    expect(sementeValida(1_000_000_000)).toBe(false);
    expect(sementeValida(1.5)).toBe(false);
  });
});

describe('verificarEntradaSala', () => {
  const BASE = { acesso: 'aberta' as const, arquivada: false, convidado: false, jaTemCidade: false, partidasEmAndamento: 0 };

  it('deixa entrar numa sala aberta', () => {
    expect(verificarEntradaSala(BASE)).toEqual({ ok: true });
  });

  it('sala por convite só para convidados', () => {
    expect(verificarEntradaSala({ ...BASE, acesso: 'convite' })).toEqual({ ok: false, motivo: 'sem_convite' });
    expect(verificarEntradaSala({ ...BASE, acesso: 'convite', convidado: true })).toEqual({ ok: true });
  });

  it('limita as partidas ao mesmo tempo', () => {
    const limite = BALANCEAMENTO.salas.partidasPorJogador;
    expect(verificarEntradaSala({ ...BASE, partidasEmAndamento: limite - 1 })).toEqual({ ok: true });
    expect(verificarEntradaSala({ ...BASE, partidasEmAndamento: limite })).toEqual({ ok: false, motivo: 'partidas_demais' });
  });

  it('recusa sala arquivada', () => {
    expect(verificarEntradaSala({ ...BASE, arquivada: true })).toEqual({ ok: false, motivo: 'sala_arquivada' });
  });

  it('quem já tem cidade sempre entra', () => {
    expect(verificarEntradaSala({ ...BASE, arquivada: true, acesso: 'convite', partidasEmAndamento: 9, jaTemCidade: true })).toEqual({ ok: true });
  });
});
