import { useState } from 'react';
import { CRONICAS } from '../lib/cronicas';

type Props = {
  /** Temporada cujo capítulo abre primeiro (a atual). Dá para voltar aos anteriores. */
  temporada: number;
  /** Capítulo que abre primeiro, se não for o da temporada (ex.: o primeiro, para ler do começo). */
  inicio?: number;
  /** Texto do botão da última página da temporada atual (ex.: "Fundar minha cidade"). */
  concluir?: string;
  onConcluir: () => void;
};

/**
 * As Crônicas do Reino como um livro: uma página de pergaminho por vez, com "Voltar" e "Continuar", e os capítulos
 * das temporadas anteriores (até a atual) para ler de novo. "Pular" fecha.
 */
export default function Cronica({ temporada, inicio, concluir = 'Fundar minha cidade', onConcluir }: Props) {
  const capitulos = Object.keys(CRONICAS)
    .map(Number)
    .filter((n) => n <= temporada)
    .sort((a, b) => a - b);
  const [numero, setNumero] = useState(() => {
    const primeiro = inicio ?? temporada;
    return CRONICAS[primeiro] ? primeiro : (capitulos.at(-1) ?? temporada);
  });
  const [pagina, setPagina] = useState(0);
  const capitulo = CRONICAS[numero];
  if (!capitulo) return null;

  const atual = capitulo.paginas[pagina]!;
  const ultimaPagina = pagina === capitulo.paginas.length - 1;
  const indice = capitulos.indexOf(numero);
  const anterior = capitulos[indice - 1];
  const seguinte = capitulos[indice + 1];

  function abrir(n: number, naUltimaPagina = false) {
    setNumero(n);
    setPagina(naUltimaPagina ? CRONICAS[n]!.paginas.length - 1 : 0);
  }
  function voltar() {
    if (pagina > 0) setPagina(pagina - 1);
    else if (anterior !== undefined) abrir(anterior, true);
  }
  function continuar() {
    if (!ultimaPagina) setPagina(pagina + 1);
    else if (seguinte !== undefined) abrir(seguinte);
    else onConcluir();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col justify-center gap-4 px-5 py-8">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-pergaminho-escuro">
        Crônicas do Reino · Temporada {numero}
      </p>
      {capitulos.length > 1 && (
        <nav aria-label="Capítulos" className="flex flex-wrap justify-center gap-1.5">
          {capitulos.map((n) => (
            <button
              key={n}
              onClick={() => abrir(n)}
              aria-current={n === numero ? 'true' : undefined}
              className={`rounded-full border px-3 py-1 text-xs ${n === numero ? 'border-ouro bg-ouro/15 text-ouro' : 'border-couro text-pergaminho-escuro hover:text-pergaminho'}`}
            >
              Temporada {n}
            </button>
          ))}
        </nav>
      )}
      <article className="rounded-2xl border-2 border-ouro/40 bg-gradient-to-b from-couro to-carvao p-6 shadow-xl">
        <p className="mb-1 font-titulo text-sm text-pergaminho-escuro">{capitulo.titulo}</p>
        <h2 className="mb-3 font-titulo text-xl text-ouro">{atual.titulo}</h2>
        <p className="leading-relaxed text-pergaminho">{atual.texto}</p>
        {ultimaPagina && <p className="mt-4 font-titulo text-ouro-claro italic">{capitulo.chamada}</p>}
      </article>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {capitulo.paginas.map((_, i) => (
          <span key={i} className={`size-2 rounded-full ${i === pagina ? 'bg-ouro' : 'bg-couro'}`} />
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <button onClick={onConcluir} className="px-2 py-2 text-sm text-pergaminho-escuro hover:text-pergaminho">
          Pular
        </button>
        <div className="flex gap-2">
          <button
            onClick={voltar}
            disabled={pagina === 0 && anterior === undefined}
            className="rounded-lg border border-couro px-3 py-2 text-pergaminho-escuro hover:text-pergaminho disabled:opacity-40"
          >
            ← Voltar
          </button>
          <button onClick={continuar} className="rounded-lg bg-ouro px-4 py-2 font-semibold text-noite hover:bg-ouro-claro">
            {!ultimaPagina ? 'Continuar' : seguinte !== undefined ? `Temporada ${seguinte} →` : concluir}
          </button>
        </div>
      </div>
    </div>
  );
}
