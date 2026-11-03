import { useEffect, useState } from 'react';
import { formatarDuracao } from '../lib/textos';

/** "🛡️ Escudo: 5 h 12 min" no cabeçalho enquanto o escudo do próprio jogador durar. */
export default function IndicadorEscudo({ ate }: { ate: number }) {
  const [agora, setAgora] = useState(Date.now);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  if (ate <= agora) return null;
  return (
    <span
      title="Ninguém pode atacar você enquanto durar. Atacar alguém (até bárbaros) quebra o escudo."
      className="rounded-full border border-ouro/50 bg-ouro/10 px-2 py-0.5 text-[11px] whitespace-nowrap text-ouro-claro tabular-nums"
    >
      🛡️ Escudo: {formatarDuracao(ate - agora)}
    </span>
  );
}
