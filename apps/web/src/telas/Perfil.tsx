import { useEffect, useState, type ReactNode } from 'react';
import Bandeira from '../componentes/Bandeira';
import EditorPerfil from '../componentes/EditorPerfil';
import { RACAS_INFO } from '../lib/textos';
import { usePerfil, type TemporadaDoPerfil } from '../lib/usePerfil';

type Props = {
  jogadorId: string;
  meuId: string;
  /** Avisa o cabeçalho quando o próprio jogador troca de nome. */
  onNomeMudou: (nome: string) => void;
};

const MOTIVO_FIM: Record<string, string> = { objetivo: 'cumpriu o objetivo', monopolio: 'monopólio comercial', prazo: 'por pontos' };

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-couro bg-carvao/90 p-4">
      <h3 className="font-titulo text-ouro">{titulo}</h3>
      {children}
    </section>
  );
}

function Numero({ rotulo, valor }: { rotulo: string; valor: ReactNode }) {
  return (
    <div className="rounded-lg bg-noite/60 px-2 py-2 text-center">
      <div className="text-lg font-semibold tabular-nums text-pergaminho">{valor}</div>
      <div className="text-[11px] text-pergaminho-escuro">{rotulo}</div>
    </div>
  );
}

function colocacao(t: TemporadaDoPerfil): string {
  return t.posicao ? `${t.posicao}º de ${t.participantes}` : 'sem placar';
}

/** Perfil de um jogador: bandeira, descrição, temporada atual, histórico e rivalidades. O dono pode editar. */
export default function Perfil({ jogadorId, meuId, onNomeMudou }: Props) {
  const { dados, erro, recarregar } = usePerfil(jogadorId);
  const [editando, setEditando] = useState(false);
  const meu = jogadorId === meuId;
  const nomeCarregado = meu ? dados?.nome : undefined;

  // O cabeçalho mostra o nome do jogador: acompanha a troca feita aqui.
  useEffect(() => {
    if (nomeCarregado) onNomeMudou(nomeCarregado);
  }, [nomeCarregado, onNomeMudou]);

  if (erro) return <p className="p-6 text-center text-pergaminho-escuro">{erro}</p>;
  if (dados === undefined) return <p className="p-6 text-center text-pergaminho-escuro">Abrindo o perfil…</p>;
  if (dados === null) return <p className="p-6 text-center text-pergaminho-escuro">Jogador não encontrado.</p>;

  const atual = dados.temporadas.find((t) => t.status === 'ativa');
  const encerradas = dados.temporadas.filter((t) => t.status === 'encerrada');
  const titulos = encerradas.filter((t) => t.venceu).length;
  const melhor = encerradas.reduce<number | null>((m, t) => (t.posicao && (m === null || t.posicao < m) ? t.posicao : m), null);

  if (editando) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        <h2 className="font-titulo text-xl text-ouro">Editar perfil</h2>
        <EditorPerfil
          perfil={dados}
          onCancelar={() => setEditando(false)}
          onSalvo={() => {
            setEditando(false);
            void recarregar();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <section className="flex flex-col items-center gap-3 rounded-2xl border-2 border-ouro/40 bg-gradient-to-b from-couro to-carvao p-5 text-center sm:flex-row sm:items-start sm:text-left">
        <Bandeira bandeira={dados.bandeira} largura={120} className="shrink-0 drop-shadow-lg" titulo={`Bandeira de ${dados.nome}`} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2 className="break-words font-titulo text-2xl text-ouro">{dados.nome}</h2>
          <p className="text-sm text-pergaminho-escuro">
            {atual?.raca && `${RACAS_INFO[atual.raca].icone} ${RACAS_INFO[atual.raca].nome} · `}
            {titulos > 0 ? `👑 ${titulos} ${titulos === 1 ? 'título' : 'títulos'}` : `${dados.temporadas.length} ${dados.temporadas.length === 1 ? 'temporada' : 'temporadas'}`}
          </p>
          {dados.descricao ? (
            <p className="whitespace-pre-line break-words text-sm text-pergaminho">{dados.descricao}</p>
          ) : (
            <p className="text-sm italic text-pergaminho-escuro/80">{meu ? 'Você ainda não escreveu nada sobre si.' : 'Sem descrição.'}</p>
          )}
          {meu && (
            <button
              onClick={() => setEditando(true)}
              className="mt-2 rounded-lg border border-ouro/60 px-4 py-2 text-sm font-semibold text-ouro hover:bg-ouro/10"
            >
              ✏️ Editar perfil
            </button>
          )}
        </div>
      </section>

      {atual && (
        <Secao titulo={`Temporada ${atual.numero}`}>
          {atual.posicao ? (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <Numero rotulo="colocação" valor={colocacao(atual)} />
              <Numero rotulo="pontos" valor={atual.pontos} />
              <Numero rotulo="territórios" valor={atual.territorios} />
              <Numero rotulo="habitantes" valor={atual.populacao} />
              <Numero rotulo="vitórias" valor={atual.vitorias} />
            </div>
          ) : (
            <p className="text-sm text-pergaminho-escuro">O placar aparece em até um minuto.</p>
          )}
        </Secao>
      )}

      <Secao titulo="Histórico">
        {encerradas.length === 0 ? (
          <p className="text-sm text-pergaminho-escuro">Nenhuma temporada encerrada ainda.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Numero rotulo="temporadas" valor={encerradas.length} />
              <Numero rotulo="títulos" valor={titulos} />
              <Numero rotulo="melhor colocação" valor={melhor ? `${melhor}º` : '–'} />
            </div>
            <ul className="divide-y divide-couro/60 text-sm">
              {encerradas.map((t) => (
                <li key={t.numero} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                  <span>
                    Temporada {t.numero}
                    {t.raca && <span className="text-pergaminho-escuro"> · {RACAS_INFO[t.raca].icone} {RACAS_INFO[t.raca].nome}</span>}
                  </span>
                  <span className={`tabular-nums ${t.venceu ? 'font-semibold text-ouro' : 'text-pergaminho-escuro'}`}>
                    {t.venceu && '👑 '}
                    {colocacao(t)}
                    {t.pontos !== null && ` · ${t.pontos} pts`}
                    {t.venceu && t.motivoFim && <span className="block text-right text-[11px] font-normal">{MOTIVO_FIM[t.motivoFim]}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Secao>

      <Secao titulo="Rivalidades">
        {dados.rivalidades.length === 0 ? (
          <p className="text-sm text-pergaminho-escuro">Nenhuma batalha contra outros jogadores em temporadas encerradas.</p>
        ) : (
          <ul className="divide-y divide-couro/60 text-sm">
            {dados.rivalidades.map((r) => (
              <li key={r.jogadorId}>
                <a href={`#perfil=${r.jogadorId}`} className="flex items-center gap-2.5 py-2 hover:text-ouro-claro">
                  <Bandeira bandeira={r.bandeira} largura={27} semEmblema />
                  <span className="min-w-0 flex-1 truncate">{r.nome}</span>
                  <span className="tabular-nums">
                    <span className="text-musgo">{r.vitorias} V</span>
                    <span className="text-pergaminho-escuro"> – </span>
                    <span className="text-sangue">{r.derrotas} D</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-pergaminho-escuro/80">
          {meu ? 'Suas batalhas' : 'Batalhas deste jogador'} contra cada um, só de temporadas encerradas: as da temporada em andamento ficam em
          segredo.
        </p>
      </Secao>
    </div>
  );
}
