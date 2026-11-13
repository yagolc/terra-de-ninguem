import { BALANCEAMENTO } from '@terra/regras';
import { useState } from 'react';
import { useGemas } from '../lib/useGemas';
import JanelaConfirmacao from './JanelaConfirmacao';

/** Botão do perfil de outro jogador: dá gemas do seu saldo a ele, sem taxa. */
export default function PresentearGemas({ jogadorId, nome }: { jogadorId: string; nome: string }) {
  const { gemas, presentear } = useGemas();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState(1);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);

  if (!gemas) return null;
  const maximo = Math.min(gemas.saldo, BALANCEAMENTO.loja.presenteMaximo);
  const valida = Number.isInteger(quantidade) && quantidade >= 1 && quantidade <= maximo;

  async function dar() {
    try {
      await presentear(jogadorId, quantidade);
      setMensagem({ texto: `🎁 ${quantidade} ${quantidade === 1 ? 'gema' : 'gemas'} para ${nome}.`, erro: false });
    } catch (e) {
      setMensagem({ texto: e instanceof Error ? e.message : 'Não deu certo. Tente de novo.', erro: true });
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setMensagem(null);
          setQuantidade(1);
          setAberto(true);
        }}
        className="mt-2 ml-2 inline-block rounded-lg border border-ouro/60 px-4 py-2 text-sm font-semibold text-ouro hover:bg-ouro/10"
      >
        🎁 Presentear gemas
      </button>
      {mensagem && <p className={`mt-1 text-sm ${mensagem.erro ? 'text-red-300' : 'text-musgo'}`}>{mensagem.texto}</p>}
      {aberto && (
        <JanelaConfirmacao
          titulo={`Presentear ${nome}`}
          confirmar={maximo === 0 ? 'Entendi' : valida ? `Dar ${quantidade} 💎` : 'Escolha a quantidade'}
          onConfirmar={() => {
            if (maximo > 0 && valida) void dar();
          }}
          onFechar={() => setAberto(false)}
        >
          {maximo === 0 ? (
            <p>Você não tem gemas para dar. Compre na loja (💎).</p>
          ) : (
            <>
              <label className="flex items-center gap-2">
                <span>Gemas:</span>
                <input
                  type="number"
                  min={1}
                  max={maximo}
                  value={quantidade}
                  onChange={(e) => setQuantidade(Math.floor(Number(e.target.value)))}
                  className="w-24 rounded-lg border border-couro bg-noite px-3 py-1.5 text-pergaminho focus:border-ouro focus:outline-none"
                />
                <span className="text-xs text-pergaminho-escuro">de {gemas.saldo}</span>
              </label>
              <p className="text-xs text-pergaminho-escuro">Saem do seu saldo e vão direto para o dele, sem taxa. Não dá para desfazer.</p>
            </>
          )}
        </JanelaConfirmacao>
      )}
    </>
  );
}
