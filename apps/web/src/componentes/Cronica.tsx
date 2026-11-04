import { useState } from 'react';
import type { Capitulo } from '../lib/cronicas';

type Props = {
  capitulo: Capitulo;
  onConcluir: () => void;
};

/** A crônica da temporada, uma página de pergaminho por vez, com "Pular". */
export default function Cronica({ capitulo, onConcluir }: Props) {
  const [pagina, setPagina] = useState(0);
  const atual = capitulo.paginas[pagina]!;
  const ultima = pagina === capitulo.paginas.length - 1;

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-5 px-5 py-8">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-pergaminho-escuro">Crônicas do Reino · {capitulo.titulo}</p>
      <article className="rounded-2xl border-2 border-ouro/40 bg-gradient-to-b from-couro to-carvao p-6 shadow-xl">
        <h2 className="mb-3 font-titulo text-xl text-ouro">{atual.titulo}</h2>
        <p className="leading-relaxed text-pergaminho">{atual.texto}</p>
        {ultima && <p className="mt-4 font-titulo text-ouro-claro italic">{capitulo.chamada}</p>}
      </article>
      <div className="flex items-center justify-between gap-3">
        <button onClick={onConcluir} className="px-2 py-2 text-sm text-pergaminho-escuro hover:text-pergaminho">
          Pular
        </button>
        <div className="flex gap-1.5" aria-hidden>
          {capitulo.paginas.map((_, i) => (
            <span key={i} className={`size-2 rounded-full ${i === pagina ? 'bg-ouro' : 'bg-couro'}`} />
          ))}
        </div>
        <button
          onClick={() => (ultima ? onConcluir() : setPagina(pagina + 1))}
          className="rounded-lg bg-ouro px-4 py-2 font-semibold text-noite hover:bg-ouro-claro"
        >
          {ultima ? 'Fundar minha cidade' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
