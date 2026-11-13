import type { TipoEstrutura } from '@terra/regras';
import { useState } from 'react';
import { chamarFuncao } from '../lib/funcoes';
import { ESTRUTURAS_INFO } from '../lib/textos';
import JanelaConfirmacao from './JanelaConfirmacao';

type Props = {
  territorioId: string;
  tipo: TipoEstrutura;
  /** Estrutura destruída: mostra o aviso e relê o mapa (aí aparece "Construir" de novo). */
  onDestruida: (mensagem: string) => void;
};

/** Botão de destruir a estrutura do próprio território (com confirmação), para construir outra no lugar. */
export default function DestruirEstrutura({ territorioId, tipo, onDestruida }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const info = ESTRUTURAS_INFO[tipo];

  async function destruir() {
    setEnviando(true);
    setErro(null);
    try {
      await chamarFuncao('cidade', { acao: 'destruir_estrutura', territorio_id: territorioId });
      onDestruida(`Estrutura destruída (${info.nome.toLowerCase()}). O território está livre para outra.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível destruir.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setConfirmando(true)}
        disabled={enviando}
        className="w-full rounded-lg border border-sangue/70 px-3 py-1.5 text-sm text-red-200 hover:bg-sangue/20 disabled:opacity-50"
      >
        {enviando ? 'Destruindo…' : `🔨 Destruir ${info.nome.toLowerCase()} para construir outra`}
      </button>
      {erro && (
        <p role="alert" className="mt-1.5 text-xs text-red-300">
          {erro}
        </p>
      )}
      {confirmando && (
        <JanelaConfirmacao
          titulo={`Destruir ${info.nome.toLowerCase()}?`}
          confirmar="Destruir"
          voltar="Manter"
          onConfirmar={() => {
            setConfirmando(false);
            void destruir();
          }}
          onFechar={() => setConfirmando(false)}
        >
          <p>
            {info.icone} <b>{info.nome}</b>: some na hora e <b>nada do que custou volta</b>. Depois dá para construir outra estrutura
            neste território.
          </p>
          {tipo === 'acampamento' && <p className="mt-2">Os lotes do Quartel que ficariam prontos aqui passam a ficar prontos na cidade.</p>}
        </JanelaConfirmacao>
      )}
    </div>
  );
}
