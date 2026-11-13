import { describe, expect, it } from 'vitest';
import { BALANCEAMENTO } from './balanceamento.ts';
import { palavrasDoTitulo, reportesParecidos, verificarAtualizacaoReporte, verificarReporte } from './reportes.ts';

const BUG = {
  tipo: 'bug',
  area: 'mapa',
  titulo: '  Mapa  não carrega no celular ',
  gravidade: 'alta',
  aconteceu: 'Tela preta.',
  esperado: 'Ver o mapa.',
  passos: '1. Abrir a aba Mapa\r\n\r\n\r\n\r\n2. Esperar',
  enviosNaUltimaHora: 0,
};

describe('verificarReporte', () => {
  it('aceita um bug completo e limpa os textos', () => {
    const r = verificarReporte(BUG);
    expect(r.ok && r.reporte).toEqual({
      tipo: 'bug',
      area: 'mapa',
      titulo: 'Mapa não carrega no celular',
      descricao: '',
      gravidade: 'alta',
      passos: '1. Abrir a aba Mapa\n\n2. Esperar',
      esperado: 'Ver o mapa.',
      aconteceu: 'Tela preta.',
    });
  });

  it('sugestão não leva gravidade nem campos de bug, e precisa de descrição', () => {
    const r = verificarReporte({ ...BUG, tipo: 'sugestao', descricao: 'Um botão para X.' });
    expect(r.ok && r.reporte).toMatchObject({ tipo: 'sugestao', gravidade: null, passos: '', esperado: '', aconteceu: '' });
    expect(verificarReporte({ ...BUG, tipo: 'sugestao', descricao: '  ' })).toEqual({ ok: false, motivo: 'texto_vazio' });
  });

  it('bug precisa de gravidade e de o que aconteceu ou descrição', () => {
    expect(verificarReporte({ ...BUG, gravidade: 'enorme' })).toEqual({ ok: false, motivo: 'gravidade_invalida' });
    expect(verificarReporte({ ...BUG, aconteceu: '' })).toEqual({ ok: false, motivo: 'texto_vazio' });
    expect(verificarReporte({ ...BUG, aconteceu: '', descricao: 'Algo deu errado.' }).ok).toBe(true);
  });

  it('confere tipo, área, tamanhos e limite por hora', () => {
    const { tituloMinimo, tituloMaximo, textoMaximo, porHora } = BALANCEAMENTO.reportes;
    expect(verificarReporte({ ...BUG, tipo: 'elogio' })).toEqual({ ok: false, motivo: 'tipo_invalido' });
    expect(verificarReporte({ ...BUG, area: 'lua' })).toEqual({ ok: false, motivo: 'area_invalida' });
    expect(verificarReporte({ ...BUG, titulo: 'a'.repeat(tituloMinimo - 1) })).toEqual({ ok: false, motivo: 'titulo_curto' });
    expect(verificarReporte({ ...BUG, titulo: 'a'.repeat(tituloMaximo + 1) })).toEqual({ ok: false, motivo: 'titulo_longo' });
    expect(verificarReporte({ ...BUG, passos: 'a'.repeat(textoMaximo + 1) })).toEqual({ ok: false, motivo: 'texto_longo' });
    expect(verificarReporte({ ...BUG, enviosNaUltimaHora: porHora })).toEqual({ ok: false, motivo: 'envios_demais' });
  });
});

describe('verificarAtualizacaoReporte', () => {
  it('só o organizador, com status válido e resposta no tamanho', () => {
    expect(verificarAtualizacaoReporte({ organizador: true, status: 'planejado', resposta: ' Boa ideia! ' })).toEqual({
      ok: true,
      status: 'planejado',
      resposta: 'Boa ideia!',
    });
    expect(verificarAtualizacaoReporte({ organizador: true, status: 'resolvido', resposta: '' })).toEqual({ ok: true, status: 'resolvido', resposta: null });
    expect(verificarAtualizacaoReporte({ organizador: false, status: 'resolvido', resposta: '' })).toEqual({ ok: false, motivo: 'nao_organizador' });
    expect(verificarAtualizacaoReporte({ organizador: true, status: 'arquivado', resposta: '' })).toEqual({ ok: false, motivo: 'status_invalido' });
    const longa = 'a'.repeat(BALANCEAMENTO.reportes.respostaMaxima + 1);
    expect(verificarAtualizacaoReporte({ organizador: true, status: 'novo', resposta: longa })).toEqual({ ok: false, motivo: 'resposta_longa' });
  });
});

describe('relatos parecidos', () => {
  it('compara palavras do título sem acento, maiúsculas e palavras curtas', () => {
    expect(palavrasDoTitulo('Mapa NÃO carrega no celular')).toEqual(['mapa', 'carrega', 'celular']);
    const existentes = [{ titulo: 'O mapa trava no celular' }, { titulo: 'Loja sem Pix' }, { titulo: 'Mapa lento' }];
    expect(reportesParecidos('Mapa não carrega no celular', existentes)).toEqual([{ titulo: 'O mapa trava no celular' }, { titulo: 'Mapa lento' }]);
    expect(reportesParecidos('ok', existentes)).toEqual([]);
  });
});
