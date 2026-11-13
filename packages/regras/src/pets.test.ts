import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { desbloqueiosDe, verificarCompraItem } from './loja.ts';
import {
  TIPOS_PET,
  petNoSaque,
  verificarEscolhaPet,
  verificarPagamentoResgate,
  verificarPrecoResgate,
  type PetNaTemporada,
} from './pets.ts';

const [A, D, X] = ['atacante', 'defensor', 'outro'];

describe('compra de pet na loja', () => {
  it('cada bicho é um item com o preço dele, e o dragão é o mais caro', () => {
    for (const tipo of TIPOS_PET) {
      const r = verificarCompraItem({ item: 'pet', variante: tipo, saldo: 100, comprados: [], temporadaId: null });
      expect(r.ok && r.preco).toBe(BALANCEAMENTO.pets.precos[tipo]);
    }
    expect(Math.max(...Object.values(BALANCEAMENTO.pets.precos))).toBe(BALANCEAMENTO.pets.precos.dragao);
    expect(verificarCompraItem({ item: 'pet', variante: 'unicornio', saldo: 100, comprados: [], temporadaId: null })).toEqual({
      ok: false,
      motivo: 'item_invalido',
    });
    const comprados = [{ item: 'pet', variante: 'lobo', temporadaId: null }];
    expect(verificarCompraItem({ item: 'pet', variante: 'lobo', saldo: 100, comprados, temporadaId: 't' })).toEqual({
      ok: false,
      motivo: 'ja_comprado',
    });
    expect(desbloqueiosDe(comprados).pets).toEqual(['lobo']);
  });
});

describe('petNoSaque', () => {
  it('leva o pet do defensor que está em casa', () => {
    const pets: PetNaTemporada[] = [{ donoId: D, tipo: 'urso', mantidoPor: D }];
    expect(petNoSaque({ pets, atacanteId: A, defensorId: D })).toEqual({ acao: 'sequestrou', donoId: D, tipo: 'urso' });
  });

  it('resgatar o próprio pet vem antes de sequestrar, e só um por saque', () => {
    const pets: PetNaTemporada[] = [
      { donoId: D, tipo: 'urso', mantidoPor: D },
      { donoId: A, tipo: 'dragao', mantidoPor: D },
    ];
    expect(petNoSaque({ pets, atacanteId: A, defensorId: D })).toEqual({ acao: 'resgatou', donoId: A, tipo: 'dragao' });
  });

  it('não leva reféns de outros jogadores nem pet que já foi sequestrado', () => {
    const pets: PetNaTemporada[] = [
      { donoId: X, tipo: 'gato', mantidoPor: D },
      { donoId: D, tipo: 'urso', mantidoPor: X },
    ];
    expect(petNoSaque({ pets, atacanteId: A, defensorId: D })).toBe(null);
  });
});

describe('escolha e resgate', () => {
  const refem: PetNaTemporada = { donoId: D, tipo: 'lobo', mantidoPor: A };

  it('escolhe só pet comprado e não troca enquanto é refém', () => {
    expect(verificarEscolhaPet({ tipo: 'lobo', comprados: ['lobo'], atual: null })).toEqual({ ok: true, tipo: 'lobo' });
    expect(verificarEscolhaPet({ tipo: null, comprados: [], atual: null })).toEqual({ ok: true, tipo: null });
    expect(verificarEscolhaPet({ tipo: 'gato', comprados: ['lobo'], atual: null })).toEqual({ ok: false, motivo: 'pet_nao_comprado' });
    expect(verificarEscolhaPet({ tipo: 'lobo', comprados: ['lobo'], atual: refem })).toEqual({ ok: false, motivo: 'pet_refem' });
  });

  it('só quem está com o refém pede preço, de 1 ao máximo', () => {
    expect(verificarPrecoResgate({ ouro: 300, pet: refem, sequestradorId: A })).toEqual({ ok: true, ouro: 300 });
    expect(verificarPrecoResgate({ ouro: 300, pet: refem, sequestradorId: X })).toEqual({ ok: false, motivo: 'pet_nao_e_refem' });
    for (const ouro of [0, 1.5, BALANCEAMENTO.pets.resgateMaximo + 1, 'dez']) {
      expect(verificarPrecoResgate({ ouro, pet: refem, sequestradorId: A })).toEqual({ ok: false, motivo: 'preco_invalido' });
    }
  });

  it('o dono paga o preço pedido se tiver o ouro', () => {
    expect(verificarPagamentoResgate({ pet: refem, donoId: D, preco: 300, ouro: 300 })).toEqual({ ok: true, ouro: 300 });
    expect(verificarPagamentoResgate({ pet: refem, donoId: D, preco: null, ouro: 999 })).toEqual({ ok: false, motivo: 'sem_preco' });
    expect(verificarPagamentoResgate({ pet: refem, donoId: D, preco: 300, ouro: 299 })).toEqual({ ok: false, motivo: 'ouro_insuficiente' });
    expect(verificarPagamentoResgate({ pet: { ...refem, mantidoPor: D }, donoId: D, preco: 1, ouro: 9 })).toEqual({
      ok: false,
      motivo: 'pet_nao_e_refem',
    });
  });
});
