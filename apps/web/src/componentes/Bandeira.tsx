import type { Bandeira as DadosBandeira } from '@terra/regras';
import { formasDoPadrao } from '../lib/bandeira';
import { CamadasEmblema } from './Emblema';

type Props = {
  bandeira: DadosBandeira;
  /** Largura em px; a altura é 2/3 dela. */
  largura?: number;
  /** Bandeiras pequenas (placar) ficam sem o emblema, que não daria para ver. */
  semEmblema?: boolean;
  className?: string;
  titulo?: string;
};

const L = 30;
const A = 20;
/** Lado do quadro do emblema no centro da bandeira. */
const E = 17;

/** Bandeira do jogador: cor, padrão na segunda cor e o emblema no meio, com borda pergaminho. */
export default function Bandeira({ bandeira, largura = 60, semEmblema, className, titulo }: Props) {
  const emblema = semEmblema ? [] : bandeira.emblema;
  return (
    <svg
      viewBox={`0 0 ${L} ${A}`}
      width={largura}
      height={(largura * A) / L}
      className={className}
      role={titulo ? 'img' : undefined}
      aria-label={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      <rect width={L} height={A} fill={bandeira.cor} />
      {formasDoPadrao(bandeira.padrao).map((forma, i) => (
        <polygon
          key={i}
          points={forma.map((v, j) => (j % 2 === 0 ? v * L : v * A)).join(' ')}
          fill={bandeira.corSecundaria}
        />
      ))}
      {emblema.length > 0 && (
        <g transform={`translate(${(L - E) / 2} ${(A - E) / 2}) scale(${E / 100})`}>
          <CamadasEmblema camadas={emblema} />
        </g>
      )}
      <rect x={0.5} y={0.5} width={L - 1} height={A - 1} fill="none" stroke="#f1e6cf" strokeOpacity={0.8} />
    </svg>
  );
}
