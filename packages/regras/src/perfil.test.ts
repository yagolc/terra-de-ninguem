import { describe, expect, it } from 'vitest';
import { CORES_SECUNDARIAS, PADROES_BANDEIRA, PADROES_EXCLUSIVOS, TAMANHO_DESCRICAO, verificarPerfil } from './perfil.ts';
import { FORMAS_EXCLUSIVAS, LIMITES_EMBLEMA } from './emblema.ts';
import { CORES_LOJA } from './loja.ts';
import { CORES_JOGADORES } from './territorios.ts';

const ESTRELA = { forma: 'estrela', x: 50, y: 50, escala: 0.6, largura: 1, altura: 1, rotacao: 0, cor: '#d4a64a', espelhar: false } as const;
const VALIDO = { cor: CORES_JOGADORES[1], corSecundaria: '#f1e6cf', padrao: 'cruz', emblema: [ESTRELA], descricao: 'Senhor do norte.' };

describe('perfil do jogador', () => {
  it('aceita uma bandeira válida', () => {
    expect(verificarPerfil(VALIDO, [CORES_JOGADORES[0]])).toEqual({
      ok: true,
      bandeira: { cor: CORES_JOGADORES[1], corSecundaria: '#f1e6cf', padrao: 'cruz', emblema: [ESTRELA] },
      descricao: 'Senhor do norte.',
    });
  });

  it('aceita cor em maiúsculas e grava em minúsculas', () => {
    const v = verificarPerfil({ ...VALIDO, cor: CORES_JOGADORES[2].toUpperCase() }, []);
    expect(v.ok && v.bandeira.cor).toBe(CORES_JOGADORES[2]);
  });

  it('a cor principal tem de ser da paleta', () => {
    expect(verificarPerfil({ ...VALIDO, cor: '#123456' }, [])).toEqual({ ok: false, motivo: 'cor_invalida' });
    expect(verificarPerfil({ ...VALIDO, cor: '#1c1410' }, [])).toEqual({ ok: false, motivo: 'cor_invalida' });
  });

  it('recusa a cor de outro jogador da temporada, mesmo com maiúsculas', () => {
    expect(verificarPerfil(VALIDO, [null, CORES_JOGADORES[1].toUpperCase()])).toEqual({ ok: false, motivo: 'cor_em_uso' });
  });

  it('a segunda cor pode ser da paleta, preto, pergaminho ou ouro', () => {
    for (const c of CORES_SECUNDARIAS) expect(verificarPerfil({ ...VALIDO, corSecundaria: c }, []).ok).toBe(true);
    expect(verificarPerfil({ ...VALIDO, corSecundaria: '#000001' }, [])).toEqual({ ok: false, motivo: 'cor_secundaria_invalida' });
  });

  it('padrão tem de ser conhecido e o emblema, válido', () => {
    const pacote = { bandeirasExclusivas: true, cores: [], titulos: [], pets: [] };
    for (const padrao of PADROES_BANDEIRA) expect(verificarPerfil({ ...VALIDO, padrao }, [], pacote).ok).toBe(true);
    expect(verificarPerfil({ ...VALIDO, padrao: 'listras' }, [])).toEqual({ ok: false, motivo: 'padrao_invalido' });
    expect(verificarPerfil({ ...VALIDO, emblema: [{ ...ESTRELA, forma: 'unicornio' }] }, [])).toEqual({ ok: false, motivo: 'emblema_invalido' });
    expect(verificarPerfil({ ...VALIDO, emblema: Array(LIMITES_EMBLEMA.camadas + 1).fill(ESTRELA) }, [])).toEqual({ ok: false, motivo: 'camadas_demais' });
    const sem = verificarPerfil({ ...VALIDO, emblema: undefined }, []);
    expect(sem.ok && sem.bandeira.emblema).toEqual([]);
  });

  it('limpa a descrição e respeita o tamanho máximo', () => {
    const v = verificarPerfil({ ...VALIDO, descricao: '  Linha 1\r\n\r\n\r\n\r\nLinha 2  ' }, []);
    expect(v.ok && v.descricao).toBe('Linha 1\n\nLinha 2');
    expect(verificarPerfil({ ...VALIDO, descricao: 'a'.repeat(TAMANHO_DESCRICAO) }, []).ok).toBe(true);
    expect(verificarPerfil({ ...VALIDO, descricao: 'a'.repeat(TAMANHO_DESCRICAO + 1) }, [])).toEqual({ ok: false, motivo: 'descricao_longa' });
  });

  it('descrição vazia vale', () => {
    const v = verificarPerfil({ ...VALIDO, descricao: undefined }, []);
    expect(v.ok && v.descricao).toBe('');
  });
});

describe('itens da loja no perfil', () => {
  const comPacote = { bandeirasExclusivas: true, cores: [CORES_LOJA.cor_ouro], titulos: [], pets: [] };

  it('padrão e forma exclusivos só com o pacote de bandeiras', () => {
    for (const padrao of PADROES_EXCLUSIVOS) {
      expect(verificarPerfil({ ...VALIDO, padrao }, [])).toEqual({ ok: false, motivo: 'item_nao_comprado' });
      expect(verificarPerfil({ ...VALIDO, padrao }, [], comPacote).ok).toBe(true);
    }
    for (const forma of FORMAS_EXCLUSIVAS) {
      const emblema = [{ ...ESTRELA, forma }];
      expect(verificarPerfil({ ...VALIDO, emblema }, [])).toEqual({ ok: false, motivo: 'item_nao_comprado' });
      expect(verificarPerfil({ ...VALIDO, emblema }, [], comPacote).ok).toBe(true);
    }
  });

  it('cor da loja só para quem comprou, como principal ou segunda cor, e sem repetir a de outro', () => {
    expect(verificarPerfil({ ...VALIDO, cor: CORES_LOJA.cor_ouro }, [])).toEqual({ ok: false, motivo: 'cor_invalida' });
    expect(verificarPerfil({ ...VALIDO, corSecundaria: CORES_LOJA.cor_ouro }, [])).toEqual({ ok: false, motivo: 'cor_secundaria_invalida' });
    expect(verificarPerfil({ ...VALIDO, cor: CORES_LOJA.cor_ouro, corSecundaria: CORES_LOJA.cor_ouro }, [], comPacote).ok).toBe(true);
    expect(verificarPerfil({ ...VALIDO, cor: CORES_LOJA.cor_prata }, [], comPacote)).toEqual({ ok: false, motivo: 'cor_invalida' });
    expect(verificarPerfil({ ...VALIDO, cor: CORES_LOJA.cor_ouro }, [CORES_LOJA.cor_ouro], comPacote)).toEqual({ ok: false, motivo: 'cor_em_uso' });
  });

  it('as cores da loja não repetem a paleta nem as segundas cores', () => {
    for (const cor of Object.values(CORES_LOJA)) {
      expect(CORES_JOGADORES as readonly string[]).not.toContain(cor);
      expect(CORES_SECUNDARIAS).not.toContain(cor);
    }
  });
});
