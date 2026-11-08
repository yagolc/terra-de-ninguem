type Props = {
  src: string;
  /** Tamanho e ajustes (ex.: "size-16 shrink-0"). */
  className?: string;
};

/** Imagem da arte do jogo com a borda esfumada, para "sumir" no fundo do painel. */
export default function Ilustracao({ src, className = '' }: Props) {
  return (
    <img
      src={src}
      alt=""
      width={512}
      height={512}
      loading="lazy"
      decoding="async"
      className={`object-contain [mask-image:radial-gradient(closest-side,black_85%,transparent)] ${className}`}
    />
  );
}
