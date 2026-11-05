import type { Session } from '@supabase/supabase-js';
import CartaObjetivo from '../componentes/CartaObjetivo';
import HistoricoTemporadas from '../componentes/HistoricoTemporadas';
import { BALANCEAMENTO } from '@terra/regras';
import TabelaPlacar from '../componentes/TabelaPlacar';
import { formatarDuracao } from '../lib/textos';
import { useTemporada } from '../lib/useTemporada';

const quando = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function prazo(ms: number): string {
  const horas = Math.max(0, Math.floor(ms / 3_600_000));
  const dias = Math.floor(horas / 24);
  return dias > 0 ? `${dias} ${dias === 1 ? 'dia' : 'dias'} e ${horas % 24} h` : `${horas} h`;
}

/** Quantas cidades livres cada dono tem (null = neutra), do que tem mais para o que tem menos. */
function contarDonos(donos: (string | null)[]): [string | null, number][] {
  const contagem = new Map<string | null, number>();
  for (const d of donos) contagem.set(d, (contagem.get(d) ?? 0) + 1);
  return [...contagem].sort((a, b) => b[1] - a[1]);
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
          Só você vê esta carta. Quem cumprir o seu primeiro vence a temporada, e todas as cartas são reveladas. Também vence quem fizer
          o monopólio comercial, logo abaixo.
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

      {dados.monopolio.donos.length > 0 && (
        <section className="rounded-xl border border-ouro/50 bg-carvao/90 p-4 text-sm">
          <h2 className="font-titulo text-lg text-ouro">⚖️ Monopólio comercial</h2>
          <p className="mt-1 text-xs text-pergaminho-escuro">
            Vale para todos: quem tiver as {dados.monopolio.donos.length} cidades livres ao mesmo tempo por{' '}
            {BALANCEAMENTO.objetivos.monopolioHoras} h seguidas vence a temporada. Perder uma zera o relógio.
          </p>
          {dados.monopolio.situacao ? (
            <p className="mt-2 font-semibold text-ouro-claro">
              {dados.monopolio.situacao.donoId === meuId ? 'Você tem' : `${dados.nomeJogador(dados.monopolio.situacao.donoId)} tem`} todas
              as cidades livres: vence em{' '}
              <span className="tabular-nums">{formatarDuracao(dados.monopolio.situacao.venceEm - Date.now())}</span>.
            </p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {contarDonos(dados.monopolio.donos).map(([dono, n]) => (
                <li key={dono ?? 'neutra'}>
                  {dono === null ? 'Neutras' : dono === meuId ? 'Você' : dados.nomeJogador(dono)}: {n}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

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
