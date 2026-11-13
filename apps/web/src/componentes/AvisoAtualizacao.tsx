import { useRegisterSW } from 'virtual:pwa-register/react';

const HORA_MS = 3600_000;

/**
 * Registra o service worker do app (PWA) e avisa quando há uma versão nova publicada: o jogador escolhe a hora de
 * atualizar, para não perder o que estiver escrevendo. Com o jogo aberto por horas, procura versão nova a cada hora.
 */
export default function AvisoAtualizacao() {
  const {
    needRefresh: [versaoNova, setVersaoNova],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => void registro.update(), HORA_MS);
    },
  });
  if (!versaoNova) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-ouro/60 bg-carvao px-4 py-3 text-sm shadow-xl md:bottom-4"
    >
      <p className="flex-1">🔄 Há uma versão nova do jogo.</p>
      <button
        onClick={() => void updateServiceWorker(true)}
        className="rounded-lg bg-ouro px-3 py-1.5 font-semibold text-noite hover:bg-ouro-claro"
      >
        Atualizar
      </button>
      <button onClick={() => setVersaoNova(false)} className="rounded-lg px-2 py-1.5 text-pergaminho-escuro hover:text-pergaminho">
        Depois
      </button>
    </div>
  );
}
