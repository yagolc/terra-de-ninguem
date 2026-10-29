export type Aba = 'cidade' | 'mapa';

export const ABAS = [
  { id: 'cidade', rotulo: 'Cidade', icone: '🏰' },
  { id: 'mapa', rotulo: 'Mapa', icone: '🗺️' },
  { id: 'relatorios', rotulo: 'Relatórios', icone: '📜' },
] as const;

/** Barra inferior do celular. Relatórios chegam no Épico 6. */
export default function NavegacaoInferior({ aba, onMudar }: { aba: Aba; onMudar: (aba: Aba) => void }) {
  return (
    <nav className="border-t border-couro bg-noite/95 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-3">
        {ABAS.map((item) => {
          const pronta = item.id !== 'relatorios';
          const ativa = item.id === aba;
          return (
            <li key={item.id}>
              <button
                disabled={!pronta}
                onClick={() => pronta && onMudar(item.id)}
                aria-current={ativa ? 'page' : undefined}
                className={`flex w-full flex-col items-center gap-0.5 py-2 text-xs ${ativa ? 'text-ouro' : pronta ? 'text-pergaminho-escuro' : 'text-pergaminho-escuro/50'}`}
              >
                <span className="text-xl" aria-hidden>
                  {item.icone}
                </span>
                {item.rotulo}
                {!pronta && <span className="text-[10px]">em breve</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
