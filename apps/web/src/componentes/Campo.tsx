import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement> & { rotulo: string };

export default function Campo({ rotulo, id, ...resto }: Props) {
  return (
    <label htmlFor={id} className="block">
      <span className="mb-1.5 block text-sm font-medium text-pergaminho-escuro">{rotulo}</span>
      <input
        id={id}
        className="w-full rounded-lg border border-couro bg-noite/70 px-3.5 py-2.5 text-base text-pergaminho placeholder:text-pergaminho-escuro/40 focus:border-ouro focus:ring-2 focus:ring-ouro/30 focus:outline-none"
        {...resto}
      />
    </label>
  );
}
