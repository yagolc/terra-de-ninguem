import type { Session } from '@supabase/supabase-js';
import CartaObjetivo from '../componentes/CartaObjetivo';
import HistoricoTemporadas from '../componentes/HistoricoTemporadas';
import TabelaPlacar from '../componentes/TabelaPlacar';
import { useTemporada } from '../lib/useTemporada';

const quando = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function prazo(ms: number): string {
  const horas = Math.max(0, Math.floor(ms / 3_600_000));
  const dias = Math.floor(horas / 24);
  return dias > 0 ? `${dias} ${dias === 1 ? 'dia' : 'dias'} e ${horas % 24} h` : `${horas} h`;
}

/** Tela "Objetivo e ranking": a carta secreta, o placar da temporada e os vencedores anteriores. */
export default function Objetivo({ sessao }: { sessao: Session }) {
  const { dados, erro } = useTemporada(sessao.user.id);
  const meuId = sessao.user.id;

  if (erro) return <p className="p-6 text-center text-pergaminho-escuro">{erro}</p>;
  if (dados === undefined) return <p className="p-6 text-center text-pergaminho-escuro">Abrindo seu objetivo…</p>;
  if (dados === null) return <p className="p-6 text-center text-pergaminho-escuro">Nenhuma temporada ainda.</p>;

  const { temporada } = dados;
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <section>
        <h2 className="mb-1 font-titulo text-lg text-ouro">Seu objetivo secreto</h2>
        <p className="mb-3 text-xs text-pergaminho-escuro">
          Só você vê esta carta. Quem cumprir o seu primeiro vence a temporada, e todas as cartas são reveladas.
        </p>
        {dados.meuObjetivo ? (
          <CartaObjetivo
            objetivo={dados.meuObjetivo}
            progresso={dados.progresso}
            nomeRegiao={dados.nomeRegiao}
            nomeJogador={dados.nomeJogador}
          />
        ) : (
          <p className="text-sm text-pergaminho-escuro">Esta temporada não tem mapa, então não há objetivos.</p>
        )}
      </section>

      <section className="rounded-xl border border-couro bg-carvao/90 p-4">
        <h2 className="font-titulo text-lg text-ouro">Ranking da Temporada {temporada.numero}</h2>
        {temporada.fimPrevisto && (
          <p className="mb-3 text-xs text-pergaminho-escuro">
            Se ninguém cumprir o objetivo, vence quem tiver mais pontos em {quando.format(new Date(temporada.fimPrevisto))} (faltam{' '}
            {prazo(temporada.fimPrevisto - Date.now())}).
          </p>
        )}
        <TabelaPlacar placar={dados.placar} meuId={meuId} />
      </section>

      <section className="rounded-xl border border-couro bg-carvao/90 p-4">
        <h2 className="mb-2 font-titulo text-lg text-ouro">Vencedores</h2>
        <HistoricoTemporadas historico={dados.historico} />
      </section>
    </div>
  );
}
