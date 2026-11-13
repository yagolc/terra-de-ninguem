import { describe, expect, it } from 'vitest';
import { verificarAtaque } from './ataques.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  duracaoVooMs,
  pactoEntre,
  parceirosDeAcesso,
  pombosDoPombal,
  validadeDaProposta,
  velocidadePombo,
  verificarCarta,
  verificarRespostaPacto,
} from './pombos.ts';
import { HORA_MS, MINUTO_MS, exercito } from './util.ts';

const P = BALANCEAMENTO.pombos;
const CARTA = {
  nivelPombal: 1,
  emVoo: 0,
  remetenteId: 'eu',
  destinatarioId: 'ele',
  destinatarioNaTemporada: true,
  texto: 'Paz entre nós?',
  proposta: undefined as unknown,
  horasPacto: undefined as unknown,
};

describe('pombal', () => {
  it('cada nível dá mais pombos e voo mais rápido', () => {
    expect(pombosDoPombal(0)).toBe(0);
    expect(pombosDoPombal(1)).toBe(P.pombosPorNivel);
    expect(pombosDoPombal(3)).toBe(3 * P.pombosPorNivel);
    expect(velocidadePombo(1)).toBe(P.velocidade);
    expect(velocidadePombo(3)).toBeCloseTo(P.velocidade * (1 + 2 * P.bonusVelocidadePorNivel));
  });

  it('o pombo voa mais rápido que a cavalaria', () => {
    expect(velocidadePombo(1)).toBeGreaterThan(BALANCEAMENTO.unidades.cavalaria.velocidade);
  });

  it('o voo leva distância ÷ velocidade, com um mínimo', () => {
    const longe = duracaoVooMs({ x: 0, y: 0 }, { x: P.velocidade, y: 0 }, 1);
    expect(longe).toBe(HORA_MS);
    expect(duracaoVooMs({ x: 0, y: 0 }, { x: 0, y: 1 }, 1)).toBe(P.duracaoMinimaMin * MINUTO_MS);
    expect(duracaoVooMs({ x: 0, y: 0 }, { x: P.velocidade, y: 0 }, 5)).toBeLessThan(longe);
  });
});

describe('carta', () => {
  it('aceita carta só com texto, limpando espaços', () => {
    expect(verificarCarta({ ...CARTA, texto: '  Oi\r\n\r\n\r\nTchau  ' })).toEqual({ ok: true, texto: 'Oi\n\nTchau', proposta: null, horasPacto: null });
  });

  it('precisa de Pombal e de pombo livre', () => {
    expect(verificarCarta({ ...CARTA, nivelPombal: 0 })).toEqual({ ok: false, motivo: 'sem_pombal' });
    expect(verificarCarta({ ...CARTA, emVoo: pombosDoPombal(1) })).toEqual({ ok: false, motivo: 'sem_pombos' });
    expect(verificarCarta({ ...CARTA, nivelPombal: 2, emVoo: pombosDoPombal(1) }).ok).toBe(true);
  });

  it('vai para outro jogador da temporada', () => {
    expect(verificarCarta({ ...CARTA, destinatarioId: 'eu' })).toEqual({ ok: false, motivo: 'destinatario_invalido' });
    expect(verificarCarta({ ...CARTA, destinatarioNaTemporada: false })).toEqual({ ok: false, motivo: 'destinatario_invalido' });
  });

  it('texto vazio só com proposta; texto longo, não', () => {
    expect(verificarCarta({ ...CARTA, texto: '   ' })).toEqual({ ok: false, motivo: 'carta_vazia' });
    expect(verificarCarta({ ...CARTA, texto: '', proposta: 'nao_agressao', horasPacto: 6 })).toEqual({
      ok: true,
      texto: '',
      proposta: 'nao_agressao',
      horasPacto: 6,
    });
    expect(verificarCarta({ ...CARTA, texto: 'a'.repeat(P.tamanhoTexto) }).ok).toBe(true);
    expect(verificarCarta({ ...CARTA, texto: 'a'.repeat(P.tamanhoTexto + 1) })).toEqual({ ok: false, motivo: 'texto_longo' });
  });

  it('o pacto dura de 1 a 12 horas inteiras', () => {
    const pacto = (horasPacto: unknown) => verificarCarta({ ...CARTA, proposta: 'nao_agressao', horasPacto });
    expect(P.pacto.horasMaximas).toBe(12);
    expect(pacto(1).ok).toBe(true);
    expect(pacto(12).ok).toBe(true);
    for (const h of [0, 13, 2.5, '6', null, undefined]) expect(pacto(h)).toEqual({ ok: false, motivo: 'horas_invalidas' });
    expect(verificarCarta({ ...CARTA, proposta: 'alianca', horasPacto: 6 })).toEqual({ ok: false, motivo: 'proposta_invalida' });
  });
});

describe('resposta ao pacto', () => {
  const chegaEm = 1_000 * HORA_MS;
  const carta = { destinatarioId: 'ele', proposta: 'nao_agressao' as const, horasPacto: 8, chegaEm, respondida: false };
  const responder = (mudar: Partial<typeof carta> = {}, agora = chegaEm + MINUTO_MS, jogadorId = 'ele', aceitar = true) =>
    verificarRespostaPacto({ carta: { ...carta, ...mudar }, jogadorId, aceitar, agora });

  it('aceito, o pacto vale as horas propostas a partir de agora', () => {
    expect(responder()).toEqual({ ok: true, pactoAte: chegaEm + MINUTO_MS + 8 * HORA_MS });
    expect(responder({}, chegaEm + MINUTO_MS, 'ele', false)).toEqual({ ok: true, pactoAte: null });
  });

  it('só quem recebeu, depois de chegar, uma vez e dentro do prazo', () => {
    expect(responder({}, chegaEm, 'eu')).toEqual({ ok: false, motivo: 'sem_proposta' });
    expect(responder({ proposta: null as never, horasPacto: null as never })).toEqual({ ok: false, motivo: 'sem_proposta' });
    expect(responder({}, chegaEm - 1)).toEqual({ ok: false, motivo: 'ainda_voando' });
    expect(responder({ respondida: true })).toEqual({ ok: false, motivo: 'ja_respondida' });
    expect(responder({}, validadeDaProposta(chegaEm))).toMatchObject({ ok: true });
    expect(responder({}, validadeDaProposta(chegaEm) + 1)).toEqual({ ok: false, motivo: 'proposta_expirada' });
  });

  it('com o objetivo em jogo, não aceita não agressão, mas recusa e aceita acesso militar', () => {
    const agora = chegaEm + MINUTO_MS;
    const comObjetivo = (mudar: Partial<typeof carta>, aceitar: boolean) =>
      verificarRespostaPacto({ carta: { ...carta, ...mudar }, jogadorId: 'ele', aceitar, agora, objetivoEmJogo: true });
    expect(comObjetivo({}, true)).toEqual({ ok: false, motivo: 'objetivo_em_jogo' });
    expect(comObjetivo({}, false)).toEqual({ ok: true, pactoAte: null });
    expect(comObjetivo({ proposta: 'acesso_militar' as never }, true)).toMatchObject({ ok: true });
  });
});

describe('pacto em vigor', () => {
  const pactos = [
    { jogadores: ['a', 'b'] as const, ate: 10 },
    { jogadores: ['b', 'a'] as const, ate: 20 },
    { jogadores: ['a', 'c'] as const, ate: 30 },
  ];

  it('vale nos dois sentidos e pega o que dura mais', () => {
    expect(pactoEntre(pactos, 'a', 'b', 5)).toBe(20);
    expect(pactoEntre(pactos, 'b', 'a', 15)).toBe(20);
    expect(pactoEntre(pactos, 'a', 'b', 20)).toBeNull();
    expect(pactoEntre(pactos, 'b', 'c', 5)).toBeNull();
  });

  it('acesso militar não conta como não agressão, e cada um vê o outro como parceiro', () => {
    const comAcesso = [...pactos, { jogadores: ['b', 'c'] as const, ate: 40, tipo: 'acesso_militar' as const }];
    expect(pactoEntre(comAcesso, 'b', 'c', 5)).toBeNull();
    expect(pactoEntre(comAcesso, 'c', 'b', 5, 'acesso_militar')).toBe(40);
    expect(parceirosDeAcesso(comAcesso, 'b', 5)).toEqual(['c']);
    expect(parceirosDeAcesso(comAcesso, 'c', 5)).toEqual(['b']);
    expect(parceirosDeAcesso(comAcesso, 'a', 5)).toEqual([]);
    expect(parceirosDeAcesso(comAcesso, 'b', 40)).toEqual([]);
  });

  it('a carta aceita propor acesso militar com as mesmas horas do pacto', () => {
    expect(verificarCarta({ ...CARTA, proposta: 'acesso_militar', horasPacto: 12 })).toMatchObject({
      ok: true,
      proposta: 'acesso_militar',
      horasPacto: 12,
    });
  });

  it('barra o ataque contra o parceiro, mas não contra territórios neutros', () => {
    const ataque = (donoId: string | null, pactoComAlvoAte: number | null, agora: number) =>
      verificarAtaque({
        tipo: 'saque',
        enviar: exercito({ lanceiro: 5 }),
        disponiveis: exercito({ lanceiro: 5 }),
        origemDoJogador: true,
        vizinhos: true,
        alvo: { donoId, cidadePrincipal: false },
        jogadorId: 'a',
        inicioTemporada: 0,
        escudoDoAlvoAte: null,
        pactoComAlvoAte,
        agora,
      });
    const depoisDaProtecao = 100 * HORA_MS;
    expect(ataque('b', depoisDaProtecao + 1, depoisDaProtecao)).toEqual({ ok: false, motivo: 'pacto_nao_agressao' });
    expect(ataque('b', depoisDaProtecao, depoisDaProtecao)).toEqual({ ok: true });
    expect(ataque(null, depoisDaProtecao + 1, depoisDaProtecao)).toEqual({ ok: true });
  });
});
