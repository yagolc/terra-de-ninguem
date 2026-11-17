import { iconeDoEmoji } from '../lib/icones';

type Props = {
  /** O emoji que o texto do jogo usa; vira o ícone desenhado da tabela de `lib/icones.ts`. */
  de: string;
  /** Tamanho (padrão: um pouco maior que o texto em volta). */
  tamanho?: string | number;
  className?: string;
  /** Texto para leitor de tela quando o ícone está sozinho (sem texto ao lado). */
  titulo?: string;
};

/**
 * Ícone medieval desenhado no lugar de um emoji. Herda a cor do texto (`currentColor`), então fica dourado, cor de
 * pergaminho ou na cor do jogador conforme a classe de quem usa. Sem desenho na tabela, mostra o emoji.
 */
export default function Icone({ de, tamanho = '1.15em', className = '', titulo }: Props) {
  const Desenho = iconeDoEmoji(de);
  const acessivel = titulo ? { role: 'img', 'aria-label': titulo } : { 'aria-hidden': true as const };
  if (!Desenho) {
    return (
      <span className={className} {...acessivel}>
        {de}
      </span>
    );
  }
  return <Desenho size={tamanho} className={`inline-block shrink-0 align-[-0.18em] ${className}`} {...acessivel} />;
}
