import { describe, expect, it } from 'vitest';
import { chaveDoNome, limparNome, TAMANHO_NOME, verificarNomeJogador } from './nome.ts';

describe('nome do jogador', () => {
  it('limpa espaços nas pontas e repetidos', () => {
    expect(limparNome('  Rei   do  Norte ')).toBe('Rei do Norte');
  });

  it('compara sem maiúsculas, acentos nem espaços extras', () => {
    expect(chaveDoNome(' Dudú ')).toBe(chaveDoNome('DUDU'));
    expect(chaveDoNome('João  Silva')).toBe(chaveDoNome('joao silva'));
  });

  it('aceita um nome livre e devolve limpo', () => {
    expect(verificarNomeJogador('  Lorde   Corvo ', ['dudu'])).toEqual({ ok: true, nome: 'Lorde Corvo' });
  });

  it('recusa nome vazio ou só com espaços', () => {
    expect(verificarNomeJogador('   ', [])).toEqual({ ok: false, motivo: 'nome_vazio' });
  });

  it('respeita o tamanho máximo depois de limpar', () => {
    const maximo = 'a'.repeat(TAMANHO_NOME.maximo);
    expect(verificarNomeJogador(maximo, []).ok).toBe(true);
    expect(verificarNomeJogador(`${maximo}a`, [])).toEqual({ ok: false, motivo: 'nome_longo' });
    expect(verificarNomeJogador(`  ${maximo}  `, []).ok).toBe(true);
  });

  it('recusa o nome de outro jogador, mesmo com acento ou maiúscula diferente', () => {
    expect(verificarNomeJogador('Dudú', ['dudu', 'gustavo'])).toEqual({ ok: false, motivo: 'nome_em_uso' });
    expect(verificarNomeJogador('GUSTAVO', ['dudu', 'gustavo'])).toEqual({ ok: false, motivo: 'nome_em_uso' });
  });
});
