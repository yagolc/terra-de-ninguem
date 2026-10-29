import type { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: 'principal' | 'discreto' };

const ESTILOS = {
  principal:
    'bg-ouro text-noite hover:bg-ouro-claro focus-visible:ring-ouro/50 disabled:bg-ouro/40 disabled:text-noite/60',
  discreto:
    'border border-couro text-pergaminho-escuro hover:border-ouro/60 hover:text-pergaminho focus-visible:ring-ouro/30',
};

export default function Botao({ variante = 'principal', className = '', ...resto }: Props) {
  return (
    <button
      className={`w-full rounded-lg px-4 py-2.5 font-semibold transition focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed ${ESTILOS[variante]} ${className}`}
      {...resto}
    />
  );
}
