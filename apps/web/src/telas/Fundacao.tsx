import { TIPOS_RACA, type Raca } from '@terra/regras';
import { useState } from 'react';
import Cronica from '../componentes/Cronica';
import { CRONICAS } from '../lib/cronicas';
import { chamarFuncao } from '../lib/funcoes';
import { RACAS_INFO } from '../lib/textos';

type Props = {
  temporada: number;
  nomeAtual: string;
  /** O jogador é o herdeiro do trono caído (vencedor da temporada anterior). */
  herdeiro: boolean;
  onFundada: () => void;
};

const chaveCronica = (temporada: number) => `cronica-vista-${temporada}`;

function cronicaJaVista(temporada: number): boolean {
  try {
    return localStorage.getItem(chaveCronica(temporada)) === 'sim';
  } catch {
    return false;
  }
}

/** Entrada na temporada: a crônica (uma vez) e depois nome e raça para fundar a cidade. */
export default function Fundacao({ temporada, nomeAtual, herdeiro, onFundada }: Props) {
  const capitulo = CRONICAS[temporada];
  const [lendo, setLendo] = useState(() => !!capitulo && !cronicaJaVista(temporada));
  const [nome, setNome] = useState(nomeAtual);
  const [raca, setRaca] = useState<Raca | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function concluirCronica() {
    try {
      localStorage.setItem(chaveCronica(temporada), 'sim');
    } catch {
      // Sem armazenamento (aba anônima): a crônica aparece de novo na próxima vez, sem problema.
    }
    setLendo(false);
  }

  async function fundar() {
    if (!raca) return;
    setEnviando(true);
    setErro(null);
    try {
      await chamarFuncao('cidade', { acao: 'entrar', raca, nome: nome.trim() });
      onFundada();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível fundar a cidade.');
      setEnviando(false);
    }
  }

  if (lendo && capitulo) return <Cronica capitulo={capitulo} onConcluir={concluirCronica} />;

  const nomeValido = nome.trim().length >= 1 && nome.trim().length <= 24;
  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <header>
        <h2 className="font-titulo text-xl text-ouro">Funde sua cidade</h2>
        <p className="text-sm text-pergaminho-escuro">
          Temporada {temporada}. A raça vale só nesta temporada; na próxima, você escolhe de novo.
          {capitulo && (
            <>
              {' '}
              <button onClick={() => setLendo(true)} className="text-ouro underline-offset-4 hover:underline">
                Reler a crônica
              </button>
            </>
          )}
        </p>
      </header>

      {herdeiro && (
        <p className="rounded-lg border border-ouro/50 bg-ouro/10 px-3 py-2 text-sm">
          👑 Você é o <b>Herdeiro do Trono Caído</b>. Sua cidade começa com a Guarda Real, mas cada batalha vencida contra você vale
          pontos a mais para os outros.
        </p>
      )}

      <label className="block space-y-1">
        <span className="text-sm text-pergaminho-escuro">Seu nome no jogo</span>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={24}
          className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-pergaminho focus:border-ouro focus:outline-none"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Raça">
        {TIPOS_RACA.map((r) => {
          const info = RACAS_INFO[r];
          return (
            <button
              key={r}
              role="radio"
              aria-checked={raca === r}
              onClick={() => setRaca(r)}
              className={`rounded-xl border-2 p-4 text-left transition ${raca === r ? 'border-ouro bg-ouro/10' : 'border-couro bg-carvao/90 hover:border-ouro/50'}`}
            >
              <p className="font-titulo text-lg text-ouro">
                {info.icone} {info.nome}
              </p>
              <p className="mt-1 text-sm text-pergaminho">✅ {info.vantagem}</p>
              <p className="mt-0.5 text-sm text-pergaminho-escuro">⚠️ {info.desvantagem}</p>
            </button>
          );
        })}
      </div>

      {erro && (
        <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
          {erro}
        </p>
      )}
      <button
        onClick={() => void fundar()}
        disabled={!raca || !nomeValido || enviando}
        className="w-full rounded-lg bg-ouro px-4 py-3 font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
      >
        {enviando ? 'Fundando…' : raca ? `${RACAS_INFO[raca].icone} Fundar minha cidade` : 'Escolha uma raça'}
      </button>
    </div>
  );
}
