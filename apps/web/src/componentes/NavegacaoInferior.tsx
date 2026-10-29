const ABAS = [
  { id: 'cidade', rotulo: 'Cidade', icone: '🏰', pronta: true },
  { id: 'mapa', rotulo: 'Mapa', icone: '🗺️', pronta: false },
  { id: 'relatorios', rotulo: 'Relatórios', icone: '📜', pronta: false },
] as const;

/** Barra inferior do celular. Mapa e Relatórios chegam nos próximos épicos. */
export default function NavegacaoInferior() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-couro bg-noite/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-3">
        {ABAS.map((aba) => (
          <li key={aba.id}>
            <button
              disabled={!aba.pronta}
              aria-current={aba.id === 'cidade' ? 'page' : undefined}
              className={`flex w-full flex-col items-center gap-0.5 py-2 text-xs ${aba.id === 'cidade' ? 'text-ouro' : 'text-pergaminho-escuro/60'}`}
            >
              <span className="text-xl" aria-hidden>
                {aba.icone}
              </span>
              {aba.rotulo}
              {!aba.pronta && <span className="text-[10px]">em breve</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
