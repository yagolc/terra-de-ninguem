import type { CamadaEmblema } from '@terra/regras';
import { FORMAS, partesDaForma, transformacaoDaCamada } from '../lib/formasEmblema';

/** As camadas do emblema, no quadro de 0 a 100, para pôr dentro de um `<svg>` (a primeira fica no fundo). */
export function CamadasEmblema({ camadas }: { camadas: readonly CamadaEmblema[] }) {
  return (
    <>
      {camadas.map((c, i) => (
        <g key={i} fill={c.cor} fillRule={FORMAS[c.forma].furos ? 'evenodd' : 'nonzero'} transform={transformacaoDaCamada(c)}>
          {partesDaForma(c.forma).map((d, j) => (
            <path key={j} d={d} />
          ))}
        </g>
      ))}
    </>
  );
}

/** Emblema sozinho (quadrado). */
export default function Emblema({ camadas, tamanho = 48, className }: { camadas: readonly CamadaEmblema[]; tamanho?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={tamanho} height={tamanho} className={className} aria-hidden>
      <CamadasEmblema camadas={camadas} />
    </svg>
  );
}
