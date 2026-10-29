import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import PainelTerritorio from '../componentes/PainelTerritorio';
import CanvasMapa from '../mapa/CanvasMapa';
import { COR_NEUTRA, useMapa } from '../lib/useMapa';

/** Tela Mapa: carregada sob demanda (o Phaser só baixa quando o jogador abre a aba). */
export default function Mapa({ sessao }: { sessao: Session }) {
  const { dados, erro } = useMapa();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const meuId = sessao.user.id;

  if (erro) return <Aviso texto={erro} />;
  if (dados === undefined) return <Aviso texto="Desenrolando o mapa…" />;
  if (dados === null) return <Aviso texto="Esta temporada ainda não tem mapa. Ele aparece quando a próxima temporada começar." />;

  // Legenda: só quem tem território (ou reserva) nesta temporada.
  const presentes = new Set(dados.territorios.flatMap((t) => [t.dono_id, t.reservado_para]).filter((id): id is string => !!id));
  const legenda = [...presentes].map((id) => dados.jogadores.get(id)).filter((j) => !!j);

  return (
    <div className="relative h-full overflow-hidden">
      <CanvasMapa dados={dados} meuId={meuId} selecionado={selecionado} onSelecionar={setSelecionado} />

      <div className="pointer-events-none absolute left-3 top-3 max-w-[60%] rounded-lg border border-couro bg-noite/85 px-3 py-2 text-xs backdrop-blur">
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {legenda.map((j) => (
            <li key={j.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: j.cor ?? COR_NEUTRA }} />
              {j.nome}
              {j.id === meuId && ' (você)'}
            </li>
          ))}
          <li className="flex items-center gap-1.5 text-pergaminho-escuro">
            <span className="size-2.5 rounded-full" style={{ background: COR_NEUTRA }} />
            Neutro
          </li>
        </ul>
        <p className="mt-1 text-pergaminho-escuro/80">Arraste para mover · role ou pince para zoom</p>
      </div>

      {selecionado && (
        <aside className="absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto rounded-t-2xl border-t border-couro bg-carvao/95 p-4 backdrop-blur md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-80 md:rounded-2xl md:border">
          <PainelTerritorio dados={dados} id={selecionado} meuId={meuId} onSelecionar={setSelecionado} />
        </aside>
      )}
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return <div className="grid h-full place-items-center px-6 text-center text-pergaminho-escuro">{texto}</div>;
}
