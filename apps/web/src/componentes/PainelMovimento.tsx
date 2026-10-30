import {
  MENSAGENS_MOVIMENTO,
  TIPOS_UNIDADE,
  duracaoMarchaMs,
  exercito,
  ligadosPorTerritoriosProprios,
  mapearExercito,
  totalUnidades,
  verificarMovimento,
  type Exercito,
} from '@terra/regras';
import { useState } from 'react';
import { chamarFuncao } from '../lib/funcoes';
import type { DadosMapa } from '../lib/useMapa';
import { UNIDADES_INFO, formatarDuracao } from '../lib/textos';

type Props = {
  dados: DadosMapa;
  origemId: string;
  meuId: string;
  agora: number;
  onVoltar: () => void;
  onEnviado: (mensagem: string) => void;
};

const horario = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

/** Move tropas de um território próprio para outro, andando só por territórios próprios. */
export default function PainelMovimento({ dados, origemId, meuId, agora, onVoltar, onEnviado }: Props) {
  const origem = dados.territorios.find((t) => t.id === origemId)!;
  const proprios = new Set(dados.territorios.filter((t) => t.dono_id === meuId).map((t) => t.id));
  const destinos = dados.territorios.filter(
    (t) =>
      t.id !== origemId &&
      t.dono_id === meuId &&
      ligadosPorTerritoriosProprios({ grafo: dados.vizinhos, origem: origemId, destino: t.id, proprios }),
  );
  const [destinoId, setDestinoId] = useState(destinos.find((t) => t.cidade_principal)?.id ?? destinos[0]?.id ?? '');
  const [enviar, setEnviar] = useState<Exercito>(exercito());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const destino = dados.territorios.find((t) => t.id === destinoId);
  const disponiveis = dados.minhasTropas.get(origemId) ?? exercito();
  const verificacao = verificarMovimento({
    enviar,
    disponiveis,
    origemDoJogador: origem.dono_id === meuId,
    destinoDoJogador: destino?.dono_id === meuId,
    mesmoTerritorio: destinoId === origemId,
    ligados: !!destino && ligadosPorTerritoriosProprios({ grafo: dados.vizinhos, origem: origemId, destino: destinoId, proprios }),
  });
  const duracao = destino && totalUnidades(enviar) > 0 ? duracaoMarchaMs(origem, destino, enviar) : null;

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await chamarFuncao('cidade', { acao: 'enviar_marcha', origem_id: origemId, destino_id: destinoId, tipo: 'movimento', tropas: enviar });
      onEnviado(`Tropas a caminho de ${destino?.nome}.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mover as tropas.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-pergaminho-escuro">Mover tropas de</p>
          <h2 className="font-titulo text-xl text-ouro">{origem.nome}</h2>
        </div>
        <button onClick={onVoltar} className="rounded-md px-2 text-sm text-pergaminho-escuro hover:text-pergaminho">
          ← Voltar
        </button>
      </header>

      {destinos.length === 0 ? (
        <p className="text-sm text-pergaminho-escuro">
          Nenhum outro território seu está ligado a este por territórios seus. Conquiste o caminho primeiro.
        </p>
      ) : (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-pergaminho-escuro">Para</span>
            <select
              value={destinoId}
              onChange={(e) => setDestinoId(e.target.value)}
              className="w-full rounded-lg border border-couro bg-noite/70 px-3 py-2 focus:border-ouro focus:outline-none"
            >
              {destinos.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.cidade_principal ? `🏰 ${d.nome} (sua cidade)` : d.nome}
                </option>
              ))}
            </select>
          </label>

          <ul className="space-y-2">
            {TIPOS_UNIDADE.map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="w-28 text-sm">
                  {UNIDADES_INFO[t].icone} {UNIDADES_INFO[t].plural}
                </span>
                <input
                  type="number"
                  min={0}
                  max={disponiveis[t]}
                  inputMode="numeric"
                  value={enviar[t]}
                  disabled={disponiveis[t] === 0}
                  onChange={(e) =>
                    setEnviar((atual) => ({
                      ...atual,
                      [t]: Math.max(0, Math.min(disponiveis[t], Math.floor(Number(e.target.value) || 0))),
                    }))
                  }
                  className="w-16 rounded-md border border-couro bg-noite/70 px-2 py-1 text-center tabular-nums focus:border-ouro focus:outline-none disabled:opacity-40"
                  aria-label={`${UNIDADES_INFO[t].plural} para mover`}
                />
                <button
                  onClick={() => setEnviar((atual) => ({ ...atual, [t]: disponiveis[t] }))}
                  disabled={disponiveis[t] === 0}
                  className="text-xs text-pergaminho-escuro hover:text-pergaminho disabled:opacity-40"
                >
                  de {disponiveis[t]}
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={() => setEnviar(mapearExercito((t) => disponiveis[t]))}
            className="text-xs text-pergaminho-escuro underline-offset-4 hover:text-pergaminho hover:underline"
          >
            Mover todas
          </button>

          {duracao !== null && (
            <p className="rounded-lg bg-noite/60 px-3 py-2 text-sm">
              ⏱ {formatarDuracao(duracao)} de caminhada · chegam {horario.format(new Date(agora + duracao))}
            </p>
          )}
          {!verificacao.ok && verificacao.motivo !== 'sem_tropas' && (
            <p className="text-sm text-red-300">{MENSAGENS_MOVIMENTO[verificacao.motivo]}</p>
          )}
          {erro && (
            <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
              {erro}
            </p>
          )}

          <button
            onClick={() => void confirmar()}
            disabled={!verificacao.ok || enviando}
            className="w-full rounded-lg bg-ouro px-3 py-2.5 font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
          >
            {enviando ? 'Enviando…' : `🚶 Mover ${totalUnidades(enviar)} ${totalUnidades(enviar) === 1 ? 'soldado' : 'soldados'}`}
          </button>
          <p className="text-xs text-pergaminho-escuro">
            Se o destino for tomado enquanto as tropas andam, elas seguem para a sua cidade.
          </p>
        </>
      )}
    </div>
  );
}
