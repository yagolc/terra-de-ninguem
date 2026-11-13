import { describe, expect, it } from 'vitest';
import { TIPOS_AVISO, verificarInscricaoAvisos } from './avisos.ts';

const INSCRICAO = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'BMzyND6WvNIn3RDlPrCdkz0TrNkrejR8OSoE3ehsbsBI', auth: 'k2Zb_3x-Q1' },
};

describe('inscrição de avisos', () => {
  it('aceita a inscrição do navegador e só os tipos conhecidos, sem repetir', () => {
    expect(verificarInscricaoAvisos({ inscricao: INSCRICAO, tipos: ['carta', 'batalha', 'carta', 'fofoca'] })).toEqual({
      ok: true,
      endpoint: INSCRICAO.endpoint,
      p256dh: INSCRICAO.keys.p256dh,
      auth: INSCRICAO.keys.auth,
      tipos: ['batalha', 'carta'],
    });
    expect(verificarInscricaoAvisos({ inscricao: INSCRICAO, tipos: [...TIPOS_AVISO] })).toMatchObject({ ok: true, tipos: TIPOS_AVISO });
  });

  it('recusa endereço sem https, chaves estranhas ou nenhum tipo', () => {
    const invalida = { ok: false, motivo: 'inscricao_invalida' };
    expect(verificarInscricaoAvisos({ inscricao: { ...INSCRICAO, endpoint: 'http://x.com' }, tipos: ['carta'] })).toEqual(invalida);
    expect(verificarInscricaoAvisos({ inscricao: { ...INSCRICAO, keys: { p256dh: 'a b', auth: 'x' } }, tipos: ['carta'] })).toEqual(invalida);
    expect(verificarInscricaoAvisos({ inscricao: null, tipos: ['carta'] })).toEqual(invalida);
    expect(verificarInscricaoAvisos({ inscricao: INSCRICAO, tipos: [] })).toEqual({ ok: false, motivo: 'sem_tipos' });
    expect(verificarInscricaoAvisos({ inscricao: INSCRICAO, tipos: 'carta' })).toEqual({ ok: false, motivo: 'sem_tipos' });
  });
});
