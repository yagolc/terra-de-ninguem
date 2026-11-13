import { TIPOS_AVISO, type TipoAviso } from '@terra/regras';
import { useCallback, useEffect, useState } from 'react';
import { ativarAvisos, desativarAvisos, lerEstadoAvisos, testarAvisos, type EstadoAvisos } from '../lib/avisos';
import { AVISOS_INFO } from '../lib/textos';

/**
 * "Avisos no celular" do próprio perfil: liga ou desliga as notificações neste aparelho, escolhe os tipos e manda
 * um aviso de teste. Cada aparelho (celular, computador) tem a sua escolha.
 */
export default function PainelAvisos() {
  const [estado, setEstado] = useState<EstadoAvisos | null>(null);
  const [tipos, setTipos] = useState<TipoAviso[]>([...TIPOS_AVISO]);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  const carregar = useCallback(async () => {
    const e = await lerEstadoAvisos();
    setEstado(e);
    if (e.tipos) setTipos(e.tipos);
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function fazer(acao: () => Promise<void>, sucesso: string) {
    setOcupado(true);
    setMensagem(null);
    try {
      await acao();
      setMensagem({ texto: sucesso, erro: false });
      await carregar();
    } catch (e) {
      setMensagem({ texto: e instanceof Error ? e.message : 'Não deu certo. Tente de novo.', erro: true });
    } finally {
      setOcupado(false);
    }
  }

  if (!estado) return null;
  const ligado = estado.tipos !== null;
  const mudou = ligado && [...tipos].sort().join() !== [...(estado.tipos ?? [])].sort().join();

  return (
    <section className="space-y-3 rounded-2xl border border-couro bg-carvao/90 p-4">
      <div>
        <h3 className="font-titulo text-lg text-ouro">🔔 Avisos no celular</h3>
        <p className="text-sm text-pergaminho-escuro">
          O jogo te chama mesmo fechado, quando algo importante acontece. Vale só para este aparelho: ative em cada um que usar.
        </p>
      </div>

      {estado.suporte === 'instalar_iphone' && (
        <p className="rounded-lg bg-noite/60 px-3 py-2 text-sm">
          No iPhone, os avisos só funcionam com o jogo instalado: toque em <b>Compartilhar</b> (⬆️), depois em{' '}
          <b>Adicionar à Tela de Início</b>, e abra o jogo pelo ícone.
        </p>
      )}
      {estado.suporte === 'nao' && <p className="text-sm text-pergaminho-escuro">Este navegador não recebe avisos.</p>}
      {estado.suporte === 'sem_app' && (
        <p className="text-sm text-pergaminho-escuro">Os avisos só funcionam no jogo publicado (recarregue a página se acabou de abrir).</p>
      )}
      {estado.suporte === 'sim' && estado.permissao === 'denied' && (
        <p className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
          As notificações deste site estão bloqueadas. Libere nas configurações do navegador (ou do app, no celular) e volte aqui.
        </p>
      )}

      {estado.suporte === 'sim' && estado.permissao !== 'denied' && (
        <>
          <fieldset className="space-y-1">
            <legend className="mb-1 text-sm text-pergaminho-escuro">Me avise quando:</legend>
            {TIPOS_AVISO.map((tipo) => (
              <label key={tipo} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tipos.includes(tipo)}
                  onChange={(e) => setTipos((atual) => (e.target.checked ? [...atual, tipo] : atual.filter((t) => t !== tipo)))}
                  className="mt-1 accent-[#d4a64a]"
                />
                <span>
                  {AVISOS_INFO[tipo].icone} {AVISOS_INFO[tipo].nome}
                  <span className="block text-xs text-pergaminho-escuro">{AVISOS_INFO[tipo].descricao}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            {!ligado ? (
              <button
                onClick={() => void fazer(() => ativarAvisos(tipos), 'Avisos ligados neste aparelho.')}
                disabled={ocupado || tipos.length === 0}
                className="rounded-lg bg-ouro px-4 py-2 font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:opacity-50"
              >
                🔔 Ativar avisos neste aparelho
              </button>
            ) : (
              <>
                {mudou && (
                  <button
                    onClick={() => void fazer(() => ativarAvisos(tipos), 'Escolha salva.')}
                    disabled={ocupado || tipos.length === 0}
                    className="rounded-lg bg-ouro px-4 py-2 font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Salvar escolha
                  </button>
                )}
                <button
                  onClick={() => void fazer(testarAvisos, 'Aviso de teste enviado: deve aparecer em instantes.')}
                  disabled={ocupado}
                  className="rounded-lg border border-ouro/60 px-4 py-2 text-ouro hover:bg-ouro/10 disabled:opacity-50"
                >
                  Mandar um teste
                </button>
                <button
                  onClick={() => void fazer(desativarAvisos, 'Avisos desligados neste aparelho.')}
                  disabled={ocupado}
                  className="rounded-lg border border-couro px-4 py-2 text-pergaminho-escuro hover:text-pergaminho disabled:opacity-50"
                >
                  Desativar aqui
                </button>
              </>
            )}
          </div>
          {ligado && !mudou && <p className="text-xs text-[#9fd39a]">✓ Avisos ligados neste aparelho.</p>}
        </>
      )}

      {mensagem && (
        <p role="status" className={`text-sm ${mensagem.erro ? 'text-red-300' : 'text-[#9fd39a]'}`}>
          {mensagem.texto}
        </p>
      )}
    </section>
  );
}
