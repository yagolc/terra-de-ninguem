import type { ReactNode } from 'react';

/** Cartão com borda dourada, usado como painel principal das telas. */
export default function Moldura({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-ouro/40 bg-carvao/90 p-6 shadow-2xl shadow-black/50 ring-1 ring-black/40 backdrop-blur sm:p-8">
      {children}
    </div>
  );
}
