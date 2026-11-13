/** `regras`, `loja`, `feedback` e `perfil` não ficam na barra: abrem pelos botões 📖, 💎 e 💬 e pelo nome no cabeçalho. */
export type Aba = 'cidade' | 'mapa' | 'objetivo' | 'relatorios' | 'cartas' | 'regras' | 'loja' | 'feedback' | 'perfil';

export const ABAS = [
  { id: 'cidade', rotulo: 'Cidade', icone: '🏰' },
  { id: 'mapa', rotulo: 'Mapa', icone: '🗺️' },
  { id: 'objetivo', rotulo: 'Objetivo', icone: '🎯' },
  { id: 'relatorios', rotulo: 'Relatórios', icone: '📜' },
  { id: 'cartas', rotulo: 'Cartas', icone: '🕊️' },
] as const;

type Props = { aba: Aba; onMudar: (aba: Aba) => void; naoLidos: number; cartasNaoLidas: number; ameacas: number };

/** Barra inferior do celular. */
export default function NavegacaoInferior({ aba, onMudar, naoLidos, cartasNaoLidas, ameacas }: Props) {
  return (
    <nav className="border-t border-couro bg-noite/95 pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="grid grid-cols-5">
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
                {item.id === 'mapa' && ameacas > 0 && (
                  <span className="absolute right-[calc(50%-1.9rem)] top-1 rounded-full bg-sangue px-1 text-[10px] font-bold text-pergaminho">
                    ⚠️{ameacas}
                  </span>
                )}
                {item.id === 'relatorios' && naoLidos > 0 && (
                  <span className="absolute right-[calc(50%-1.6rem)] top-1 min-w-4 rounded-full bg-sangue px-1 text-[10px] font-bold text-pergaminho">
                    {naoLidos}
                  </span>
                )}
                {item.id === 'cartas' && cartasNaoLidas > 0 && (
                  <span className="absolute right-[calc(50%-1.6rem)] top-1 min-w-4 rounded-full bg-sangue px-1 text-[10px] font-bold text-pergaminho">
                    {cartasNaoLidas}
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
