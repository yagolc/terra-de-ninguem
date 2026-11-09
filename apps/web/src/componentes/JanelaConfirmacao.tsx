import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  titulo: string;
  children: ReactNode;
  /** Texto do botão que confirma (ex.: "Cancelar obra"). */
  confirmar: string;
  /** Texto do botão que desiste (ex.: "Manter"). */
  voltar?: string;
  onConfirmar: () => void;
  onFechar: () => void;
};

/**
 * Janela de confirmação por cima da tela (o `<dialog>` do navegador: prende o foco e fecha com Esc ou tocando
 * fora). Só existe enquanto está aberta: quem usa a monta quando precisa confirmar e a desmonta em `onFechar`.
 */
export default function JanelaConfirmacao({ titulo, children, confirmar, voltar = 'Voltar', onConfirmar, onFechar }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const janela = ref.current;
    if (janela && !janela.open) janela.showModal();
    return () => janela?.close();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onFechar}
      onClick={(e) => {
        // Toque no fundo escuro (fora da caixa) fecha.
        if (e.target === ref.current) ref.current.close();
      }}
      aria-labelledby="janela-confirmacao-titulo"
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-ouro/50 bg-carvao p-0 text-pergaminho backdrop:bg-noite/80"
    >
      <div className="space-y-3 p-5">
        <h2 id="janela-confirmacao-titulo" className="font-titulo text-lg text-ouro">
          {titulo}
        </h2>
        <div className="space-y-2 text-sm">{children}</div>
        <div className="flex gap-2 pt-1">
          <button
            autoFocus
            onClick={() => ref.current?.close()}
            className="flex-1 rounded-lg border border-couro px-3 py-2 text-sm font-semibold text-pergaminho-escuro hover:border-ouro/60 hover:text-pergaminho"
          >
            {voltar}
          </button>
          <button
            onClick={() => {
              onConfirmar();
              ref.current?.close();
            }}
            className="flex-1 rounded-lg bg-sangue px-3 py-2 text-sm font-semibold text-pergaminho hover:bg-sangue/80"
          >
            {confirmar}
          </button>
        </div>
      </div>
    </dialog>
  );
}
