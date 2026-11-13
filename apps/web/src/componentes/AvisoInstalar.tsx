import { useState } from 'react';
import { useInstalacao } from '../lib/instalacao';

const CHAVE = 'terra:instalar-dispensado-ate';
const DIAS_DISPENSADO = 30;

function dispensadoAinda(): boolean {
  try {
    return Number(localStorage.getItem(CHAVE) ?? 0) > Date.now();
  } catch {
    return false;
  }
}

/**
 * Convite para instalar o jogo como app (ícone na tela inicial, tela cheia). Some quando o jogo já está aberto
 * como app, quando o navegador não instala, ou por 30 dias depois de "Agora não".
 */
export default function AvisoInstalar() {
  const { modo, instalar } = useInstalacao();
  const [dispensado, setDispensado] = useState(dispensadoAinda);
  if (modo === 'nenhum' || dispensado) return null;

  function dispensar() {
    try {
      localStorage.setItem(CHAVE, String(Date.now() + DIAS_DISPENSADO * 24 * 3600_000));
    } catch {
      // Sem armazenamento (aba anônima): some só até recarregar.
    }
    setDispensado(true);
  }

  return (
    <div className="border-b border-couro bg-carvao/95">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 text-sm">
        <img src="/icone-192.png" alt="" width={32} height={32} className="size-8 rounded-lg" />
        <p className="min-w-0 flex-1 basis-56">
          {modo === 'botao' ? (
            <>
              <b>Instale o jogo</b> no celular ou no computador: ícone na tela inicial e tela cheia, sem a barra do navegador.
            </>
          ) : (
            <>
              <b>Instale o jogo no iPhone:</b> toque em <b>Compartilhar</b> (o quadrado com a seta ⬆️) e depois em{' '}
              <b>Adicionar à Tela de Início</b>.
            </>
          )}
        </p>
        <div className="flex gap-2">
          {modo === 'botao' && (
            <button
              onClick={() => void instalar()}
              className="rounded-lg bg-ouro px-3 py-1.5 font-semibold text-noite hover:bg-ouro-claro"
            >
              📲 Instalar
            </button>
          )}
          <button onClick={dispensar} className="rounded-lg border border-couro px-3 py-1.5 text-pergaminho-escuro hover:text-pergaminho">
            {modo === 'botao' ? 'Agora não' : 'Entendi'}
          </button>
        </div>
      </div>
    </div>
  );
}
