import { useEffect, useRef, useState } from 'react';
import { FAIXAS, musica, useMusica } from '../lib/musica';
import Icone from './Icone';

/**
 * Controle da música no cabeçalho: um toque no alto-falante liga ou desliga; a setinha abre o volume, o nome da
 * faixa e o botão de pular. A escolha fica guardada no aparelho. No celular, onde o cabeçalho é apertado, a setinha
 * some: o volume é o dos botões do aparelho.
 */
export default function ControleMusica() {
  const { volume, mudo, faixa } = useMusica();
  const [aberto, setAberto] = useState(false);
  const caixa = useRef<HTMLDivElement>(null);

  // Fecha ao tocar fora do painel.
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('pointerdown', fora);
    return () => document.removeEventListener('pointerdown', fora);
  }, [aberto]);

  const porcento = Math.round((mudo ? 0 : volume) * 100);

  return (
    <div ref={caixa} className="relative flex">
      <button
        onClick={() => musica.alternarMudo()}
        aria-pressed={!mudo}
        title={mudo ? 'Ligar a música' : 'Desligar a música'}
        className={`rounded-lg border px-2.5 py-1.5 text-sm sm:rounded-r-none ${mudo ? 'border-couro text-pergaminho-escuro hover:text-pergaminho' : 'border-couro text-ouro hover:text-ouro-claro'}`}
      >
        <Icone de={mudo ? '🔇' : '🔊'} titulo={mudo ? 'Música desligada' : 'Música ligada'} />
      </button>
      <button
        onClick={() => setAberto(!aberto)}
        aria-expanded={aberto}
        title="Volume da música"
        className="hidden min-w-0 rounded-r-lg border border-l-0 border-couro px-1 py-1.5 text-xs sm:block text-pergaminho-escuro hover:text-pergaminho"
      >
        <span aria-hidden>{aberto ? '▴' : '▾'}</span>
        <span className="sr-only">Volume da música</span>
      </button>
      {aberto && (
        <div className="absolute right-0 top-full z-30 mt-2 w-64 rounded-xl border border-couro bg-noite p-3 shadow-xl">
          <label className="block text-sm text-pergaminho">
            <span className="flex items-center justify-between">
              <span>
                <Icone de="🎵" /> Volume da música
              </span>
              <span className="tabular-nums text-pergaminho-escuro">{porcento}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={porcento}
              onChange={(e) => musica.definirVolume(Number(e.target.value) / 100)}
              className="mt-2 w-full accent-ouro"
            />
          </label>
          <p className="mt-2 truncate text-xs text-pergaminho-escuro">
            {mudo ? 'Desligada' : faixa ? `Tocando: ${FAIXAS[faixa].titulo}` : 'Começa no próximo toque na tela'}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => musica.alternarMudo()}
              className="flex-1 rounded-lg border border-couro px-2 py-1 text-sm text-pergaminho hover:border-ouro"
            >
              {mudo ? 'Ligar' : 'Desligar'}
            </button>
            <button
              onClick={() => musica.proxima()}
              disabled={mudo}
              className="flex-1 rounded-lg border border-couro px-2 py-1 text-sm text-pergaminho hover:border-ouro disabled:opacity-40"
            >
              Próxima ⏭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
