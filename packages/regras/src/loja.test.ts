import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import {
  CORES_LOJA,
  TITULOS_LOJA,
  desbloqueiosDe,
  gastoTerminarObra,
  obraAceleravel,
  pacoteValido,
  precoArauto,
  precoTerminarObra,
  terminarObraAgora,
  verificarArauto,
  verificarCompraItem,
  verificarPresente,
  verificarTitulo,
  type ItemComprado,
} from './loja.ts';
import { prediosIniciais } from './predios.ts';
import type { Obra } from './tipos.ts';

const AGORA = 10_000_000;
const MIN = 60_000;

describe('precoTerminarObra', () => {
  it('começa no preço base e dobra a cada uso', () => {
    const base = BALANCEAMENTO.loja.terminarObra.precoBase;
    expect([0, 1, 2, 3, 4].map(precoTerminarObra)).toEqual([base, base * 2, base * 4, base * 8, base * 16]);
  });

  it('o gasto total dos primeiros usos é base × (2^n − 1)', () => {
    const base = BALANCEAMENTO.loja.terminarObra.precoBase;
    for (let n = 0; n <= 10; n++) expect(gastoTerminarObra(n)).toBe(base * (2 ** n - 1));
  });
});

describe('obraAceleravel', () => {
  it('vale até o nível máximo da loja e nunca na Muralha', () => {
    const max = BALANCEAMENTO.loja.terminarObra.nivelMaximo;
    expect(obraAceleravel('casa', 1)).toBe(true);
    expect(obraAceleravel('casa', max)).toBe(true);
    expect(obraAceleravel('casa', max + 1)).toBe(false);
    expect(obraAceleravel('muralha', 1)).toBe(false);
  });
});

describe('pacoteValido', () => {
  it('aceita só os pacotes à venda', () => {
    expect(pacoteValido(BALANCEAMENTO.loja.pacotes[0])).toBe(true);
    expect(pacoteValido(3)).toBe(false);
    expect(pacoteValido('2')).toBe(false);
  });
});

describe('terminarObraAgora', () => {
  const predios = { ...prediosIniciais(), centro: 5, casa: 2, fazenda: 1 };
  // Casa 3 andando (termina em 10 min), Fazenda 2 (+20 min), Casa 4 (+30 min).
  const obras: Obra[] = [
    { tipo: 'casa', prontoEm: AGORA + 10 * MIN },
    { tipo: 'fazenda', prontoEm: AGORA + 30 * MIN },
    { tipo: 'casa', prontoEm: AGORA + 60 * MIN },
  ];
  const base = { predios, obras, prontoEm: AGORA + 10 * MIN, gemas: 100, usos: 0, agora: AGORA };

  it('termina a primeira, cobra o preço e a próxima começa agora com a mesma duração', () => {
    const r = terminarObraAgora(base);
    expect(r).toEqual({
      ok: true,
      tipo: 'casa',
      nivelAlvo: 3,
      preco: precoTerminarObra(0),
      obras: [
        { tipo: 'fazenda', prontoEm: AGORA + 20 * MIN },
        { tipo: 'casa', prontoEm: AGORA + 50 * MIN },
      ],
    });
  });

  it('o preço segue os usos da temporada', () => {
    const r = terminarObraAgora({ ...base, usos: 3 });
    expect(r.ok && r.preco).toBe(precoTerminarObra(3));
  });

  it('recusa sem obra, com outra obra que não a andando, ou sem gemas', () => {
    expect(terminarObraAgora({ ...base, obras: [] })).toEqual({ ok: false, motivo: 'sem_obra' });
    expect(terminarObraAgora({ ...base, prontoEm: AGORA + 30 * MIN })).toEqual({ ok: false, motivo: 'item_invalido' });
    expect(terminarObraAgora({ ...base, gemas: precoTerminarObra(0) - 1 })).toEqual({ ok: false, motivo: 'gemas_insuficientes' });
    expect(terminarObraAgora({ ...base, gemas: 1000, usos: 2, prontoEm: AGORA + 10 * MIN }).ok).toBe(true);
  });

  it('recusa a Muralha e níveis acima do máximo da loja', () => {
    const muralha: Obra[] = [{ tipo: 'muralha', prontoEm: AGORA + MIN }];
    expect(terminarObraAgora({ ...base, obras: muralha, prontoEm: AGORA + MIN })).toEqual({ ok: false, motivo: 'predio_proibido' });
    const max = BALANCEAMENTO.loja.terminarObra.nivelMaximo;
    const alta = { ...predios, centro: 10, casa: max };
    const obraAlta: Obra[] = [{ tipo: 'casa', prontoEm: AGORA + MIN }];
    expect(terminarObraAgora({ ...base, predios: alta, obras: obraAlta, prontoEm: AGORA + MIN })).toEqual({ ok: false, motivo: 'nivel_alto' });
    const noLimite = { ...alta, casa: max - 1 };
    expect(terminarObraAgora({ ...base, predios: noLimite, obras: obraAlta, prontoEm: AGORA + MIN }).ok).toBe(true);
  });
});

describe('verificarCompraItem', () => {
  const T = 'temporada-1';
  const base = { saldo: 100, comprados: [] as ItemComprado[], temporadaId: T };

  it('compra item permanente pelo preço do balanceamento, sem temporada', () => {
    const r = verificarCompraItem({ ...base, item: 'bandeiras_exclusivas', temporadaId: null });
    expect(r).toEqual({ ok: true, item: 'bandeiras_exclusivas', variante: null, preco: BALANCEAMENTO.loja.itens.bandeiras_exclusivas.preco, temporadaId: null });
  });

  it('título precisa de variante válida e cada título é um item', () => {
    expect(verificarCompraItem({ ...base, item: 'titulo' })).toEqual({ ok: false, motivo: 'item_invalido' });
    expect(verificarCompraItem({ ...base, item: 'titulo', variante: 'rei_do_mundo' })).toEqual({ ok: false, motivo: 'item_invalido' });
    const comprados: ItemComprado[] = [{ item: 'titulo', variante: 'mecenas', temporadaId: null }];
    expect(verificarCompraItem({ ...base, comprados, item: 'titulo', variante: 'mecenas' })).toEqual({ ok: false, motivo: 'ja_comprado' });
    expect(verificarCompraItem({ ...base, comprados, item: 'titulo', variante: 'tirano' }).ok).toBe(true);
  });

  it('permanente não se compra duas vezes, nem em outra temporada', () => {
    const comprados: ItemComprado[] = [{ item: 'cor_ouro', variante: null, temporadaId: null }];
    expect(verificarCompraItem({ ...base, comprados, item: 'cor_ouro', temporadaId: 'outra' })).toEqual({ ok: false, motivo: 'ja_comprado' });
  });

  it('item de temporada precisa de temporada ativa e volta a valer na próxima', () => {
    expect(verificarCompraItem({ ...base, item: 'destaque_cidade', temporadaId: null })).toEqual({ ok: false, motivo: 'sem_temporada' });
    const comprados: ItemComprado[] = [{ item: 'destaque_cidade', variante: null, temporadaId: T }];
    expect(verificarCompraItem({ ...base, comprados, item: 'destaque_cidade' })).toEqual({ ok: false, motivo: 'ja_comprado' });
    const r = verificarCompraItem({ ...base, comprados, item: 'destaque_cidade', temporadaId: 'temporada-2' });
    expect(r.ok && r.temporadaId).toBe('temporada-2');
  });

  it('recusa item desconhecido e saldo curto', () => {
    expect(verificarCompraItem({ ...base, item: 'dragao' })).toEqual({ ok: false, motivo: 'item_invalido' });
    expect(verificarCompraItem({ ...base, saldo: 1, item: 'cor_prata' })).toEqual({ ok: false, motivo: 'gemas_insuficientes' });
  });
});

describe('desbloqueiosDe e verificarTitulo', () => {
  it('junta pacote, cores e títulos comprados', () => {
    const d = desbloqueiosDe([
      { item: 'bandeiras_exclusivas', variante: null, temporadaId: null },
      { item: 'cor_prata', variante: null, temporadaId: null },
      { item: 'titulo', variante: 'lobo_da_fronteira', temporadaId: null },
      { item: 'destaque_cidade', variante: null, temporadaId: 't' },
    ]);
    expect(d).toEqual({ bandeirasExclusivas: true, cores: [CORES_LOJA.cor_prata], titulos: ['lobo_da_fronteira'] });
    expect(verificarTitulo('lobo_da_fronteira', d)).toEqual({ ok: true, titulo: 'lobo_da_fronteira' });
    expect(verificarTitulo(null, d)).toEqual({ ok: true, titulo: null });
    expect(verificarTitulo('mecenas', d)).toEqual({ ok: false, motivo: 'titulo_nao_comprado' });
  });

  it('os nomes dos títulos cabem no placar', () => {
    for (const nome of Object.values(TITULOS_LOJA)) expect(nome.length).toBeLessThanOrEqual(24);
  });
});

describe('verificarArauto', () => {
  const base = { texto: 'O Império exige tributo!', saldo: 100, usos: 0, noArAte: null, agora: AGORA };
  const { precoBase, duracaoHoras, tamanhoMaximo } = BALANCEAMENTO.loja.arauto;

  it('publica por 24 h pelo preço base e o preço dobra com os usos', () => {
    expect(verificarArauto(base)).toEqual({ ok: true, texto: base.texto, preco: precoBase, ate: AGORA + duracaoHoras * 3600_000 });
    expect([0, 1, 2, 3].map(precoArauto)).toEqual([precoBase, precoBase * 2, precoBase * 4, precoBase * 8]);
    const r = verificarArauto({ ...base, usos: 2 });
    expect(r.ok && r.preco).toBe(precoBase * 4);
  });

  it('limpa o texto e confere o tamanho', () => {
    const r = verificarArauto({ ...base, texto: '  Paz\n\n  ou   guerra  ' });
    expect(r.ok && r.texto).toBe('Paz ou guerra');
    expect(verificarArauto({ ...base, texto: '   ' })).toEqual({ ok: false, motivo: 'texto_vazio' });
    expect(verificarArauto({ ...base, texto: 'a'.repeat(tamanhoMaximo) }).ok).toBe(true);
    expect(verificarArauto({ ...base, texto: 'a'.repeat(tamanhoMaximo + 1) })).toEqual({ ok: false, motivo: 'texto_longo' });
  });

  it('um por jogador no ar e saldo suficiente', () => {
    expect(verificarArauto({ ...base, noArAte: AGORA + MIN })).toEqual({ ok: false, motivo: 'arauto_no_ar' });
    expect(verificarArauto({ ...base, noArAte: AGORA }).ok).toBe(true);
    expect(verificarArauto({ ...base, saldo: precoBase - 1 })).toEqual({ ok: false, motivo: 'gemas_insuficientes' });
  });
});

describe('verificarPresente', () => {
  it('aceita inteiros de 1 ao máximo, para outro jogador, dentro do saldo', () => {
    expect(verificarPresente({ gemas: 5, saldo: 5, paraSiMesmo: false })).toEqual({ ok: true, gemas: 5 });
    for (const gemas of [0, -1, 1.5, '3', BALANCEAMENTO.loja.presenteMaximo + 1]) {
      expect(verificarPresente({ gemas, saldo: 1000, paraSiMesmo: false })).toEqual({ ok: false, motivo: 'quantidade_invalida' });
    }
    expect(verificarPresente({ gemas: 1, saldo: 10, paraSiMesmo: true })).toEqual({ ok: false, motivo: 'para_si_mesmo' });
    expect(verificarPresente({ gemas: 6, saldo: 5, paraSiMesmo: false })).toEqual({ ok: false, motivo: 'gemas_insuficientes' });
  });
});
