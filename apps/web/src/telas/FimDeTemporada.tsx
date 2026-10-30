import type { Session } from '@supabase/supabase-js';
import CartaObjetivo from '../componentes/CartaObjetivo';
import HistoricoTemporadas from '../componentes/HistoricoTemporadas';
import TabelaPlacar from '../componentes/TabelaPlacar';
import { useTemporada } from '../lib/useTemporada';

/** Mostrada quando nenhuma temporada está ativa: vencedor, objetivos revelados e placar final. */
export default function FimDeTemporada({ sessao }: { sessao: Session }) {
  const { dados, erro } = useTemporada(sessao.user.id);

  if (erro) return <p className="p-6 text-center text-pergaminho-escuro">{erro}</p>;
  if (dados === undefined) return <p className="p-6 text-center text-pergaminho-escuro">Carregando…</p>;
  if (dados === null) {
    return <p className="p-6 text-center text-pergaminho-escuro">A primeira temporada ainda não começou. Aguarde o organizador.</p>;
  }

  const { temporada } = dados;
  const vencedor = temporada.vencedorId ? dados.nomeJogador(temporada.vencedorId) : null;
  const venci = temporada.vencedorId === sessao.user.id;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="text-center">
        <p className="text-sm uppercase tracking-widest text-pergaminho-escuro">Temporada {temporada.numero} encerrada</p>
        <h2 className="mt-2 font-titulo text-3xl text-ouro">{vencedor ? `👑 ${vencedor}` : 'Sem vencedor'}</h2>
        <p className="mt-2 text-pergaminho">
          {venci ? 'Você venceu! ' : ''}
          {temporada.motivoFim === 'objetivo'
            ? `${vencedor} cumpriu o objetivo secreto primeiro.`
            : 'O prazo acabou e venceu quem tinha mais pontos.'}
        </p>
        <p className="mt-3 text-sm text-pergaminho-escuro">
          O reino descansa até a próxima temporada começar, com um mapa novo e todos do zero.
        </p>
      </header>

      {dados.revelados.length > 0 && (
        <section>
          <h3 className="mb-3 font-titulo text-lg text-ouro">Os objetivos secretos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {dados.revelados.map((r) => (
              <CartaObjetivo
                key={r.jogadorId}
                objetivo={r.objetivo}
                progresso={null}
                nomeRegiao={dados.nomeRegiao}
                nomeJogador={dados.nomeJogador}
                dono={dados.nomeJogador(r.jogadorId)}
                cumprido={!!r.cumpridoEm}
              />
            ))}
          </div>
        </section>
      )}

      <section className="rounded-xl border border-couro bg-carvao/90 p-4">
        <h3 className="mb-2 font-titulo text-lg text-ouro">Placar final</h3>
        <TabelaPlacar placar={dados.placar} meuId={sessao.user.id} vencedorId={temporada.vencedorId} />
      </section>

      <section className="rounded-xl border border-couro bg-carvao/90 p-4">
        <h3 className="mb-2 font-titulo text-lg text-ouro">Vencedores</h3>
        <HistoricoTemporadas historico={dados.historico} />
      </section>
    </div>
  );
}
