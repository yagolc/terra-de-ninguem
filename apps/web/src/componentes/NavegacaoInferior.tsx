export type Aba = 'cidade' | 'mapa' | 'relatorios';

export const ABAS = [
  { id: 'cidade', rotulo: 'Cidade', icone: '🏰' },
  { id: 'mapa', rotulo: 'Mapa', icone: '🗺️' },
  { id: 'relatorios', rotulo: 'Relatórios', icone: '📜' },
] as const;

type Props = { aba: Aba; onMudar: (aba: Aba) => void; naoLidos: number };

/** Barra inferior do celular. */
export default function NavegacaoInferior({ aba, onMudar, naoLidos }: Props) {
  return (
    <nav className="border-t border-couro bg-noite/95 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-3">
        {ABAS.map((item) => {
          const ativa = item.id === aba;
          return (
            <li key={item.id}>
              <button
                onClick={() => onMudar(item.id)}
                aria-current={ativa ? 'page' : undefined}
                className={`relative flex w-full flex-col items-center gap-0.5 py-2 text-xs ${ativa ? 'text-ouro' : 'text-pergaminho-escuro'}`}
              >
                <span className="text-xl" aria-hidden>
                  {item.icone}
                </span>
                {item.rotulo}
                {item.id === 'relatorios' && naoLidos > 0 && (
                  <span className="absolute right-[calc(50%-1.6rem)] top-1 min-w-4 rounded-full bg-sangue px-1 text-[10px] font-bold text-pergaminho">
                    {naoLidos}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
