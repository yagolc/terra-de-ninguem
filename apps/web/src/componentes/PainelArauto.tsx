import { BALANCEAMENTO, limparTextoArauto, precoArauto } from '@terra/regras';
import { useState } from 'react';
import type { Gemas } from '../lib/useGemas';
import { formatarDuracao } from '../lib/textos';
import JanelaConfirmacao from './JanelaConfirmacao';

type Props = { gemas: Gemas; agora: number; ocupado: boolean; onPublicar: (texto: string) => Promise<boolean> };

/** Arauto da loja: escreve um anúncio que aparece no alto do mapa para todos por 24 h. */
export default function PainelArauto({ gemas, agora, ocupado, onPublicar }: Props) {
  const [texto, setTexto] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const { tamanhoMaximo, duracaoHoras } = BALANCEAMENTO.loja.arauto;
  const limpo = limparTextoArauto(texto);
  const tamanho = [...limpo].length;
  const preco = precoArauto(gemas.arautos.usos);
  const noAr = gemas.arautos.noArAte !== null && gemas.arautos.noArAte > agora;
  const semTemporada = !gemas.temporadaId;

  return (
    <div className="space-y-2">
      <h4 className="font-titulo text-ouro">📯 Arauto</h4>
      <p className="text-xs text-pergaminho-escuro">
        Seu anúncio aparece no alto do mapa para todos por {duracaoHoras} h, e quem tem avisos de carta ligados recebe no celular. Um por vez;
        o preço dobra a cada arauto na temporada ({[0, 1, 2].map(precoArauto).join(', ')}…).
      </p>
      {semTemporada ? (
        <p className="text-sm text-pergaminho-escuro">Sem temporada em andamento.</p>
      ) : noAr ? (
        <p className="text-sm text-musgo">Seu arauto está anunciando por mais {formatarDuracao(gemas.arautos.noArAte! - agora)}.</p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="sr-only">Texto do arauto</span>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={2}
              placeholder="O Império exige tributo de todas as vilas do norte!"
              className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-sm text-pergaminho focus:border-ouro focus:outline-none"
            />
            <span className={`block text-right text-xs tabular-nums ${tamanho > tamanhoMaximo ? 'text-red-300' : 'text-pergaminho-escuro'}`}>
              {tamanho}/{tamanhoMaximo}
            </span>
          </label>
          <button
            disabled={ocupado || tamanho === 0 || tamanho > tamanhoMaximo}
            onClick={() => setConfirmando(true)}
            className="rounded-lg border border-ouro/60 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Anunciar · {preco} 💎
          </button>
        </>
      )}
      {confirmando && (
        <JanelaConfirmacao
          titulo="Anunciar no mapa?"
          confirmar={gemas.saldo >= preco ? `Anunciar por ${preco} 💎` : 'Entendi'}
          onConfirmar={() => {
            if (gemas.saldo >= preco) void onPublicar(limpo).then((ok) => ok && setTexto(''));
          }}
          onFechar={() => setConfirmando(false)}
        >
          <p className="break-words rounded-lg border border-couro bg-noite/60 px-3 py-2">📯 {limpo}</p>
          <p>
            Fica {duracaoHoras} h no alto do mapa, para todos. Custa <b>{preco} gemas</b> (você tem {gemas.saldo}); o próximo vai custar{' '}
            {precoArauto(gemas.arautos.usos + 1)}.
          </p>
          {gemas.saldo < preco && <p className="text-red-300">Gemas insuficientes: compre um pacote abaixo.</p>}
        </JanelaConfirmacao>
      )}
    </div>
  );
}
