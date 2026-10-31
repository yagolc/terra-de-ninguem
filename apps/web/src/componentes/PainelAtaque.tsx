import {
  MENSAGENS_ATAQUE,
  TIPOS_UNIDADE,
  duracaoMarchaMs,
  exercito,
  fimProtecaoIniciante,
  mapearExercito,
  totalUnidades,
  verificarAtaque,
  type Exercito,
  type TipoAtaque,
} from '@terra/regras';
import { useState } from 'react';
import { chamarFuncao } from '../lib/funcoes';
import InfoReconhecimento from './InfoReconhecimento';
import type { DadosMapa } from '../lib/useMapa';
import { UNIDADES_INFO, formatarDuracao } from '../lib/textos';

type Props = {
  dados: DadosMapa;
  alvoId: string;
  meuId: string;
  agora: number;
  onVoltar: () => void;
  onEnviado: (mensagem: string) => void;
};

/** Territórios do jogador vizinhos do alvo e com tropas paradas: de onde o ataque pode sair. */
export function origensPossiveis(dados: DadosMapa, alvoId: string, meuId: string) {
  return (dados.vizinhos.get(alvoId) ?? [])
    .map((id) => dados.territorios.find((t) => t.id === id)!)
    .filter((t) => t && t.dono_id === meuId && totalUnidades(dados.minhasTropas.get(t.id) ?? exercito()) > 0);
}

const horario = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export default function PainelAtaque({ dados, alvoId, meuId, agora, onVoltar, onEnviado }: Props) {
  const alvo = dados.territorios.find((t) => t.id === alvoId)!;
  const origens = origensPossiveis(dados, alvoId, meuId);
  const [origemId, setOrigemId] = useState(origens[0]?.id ?? '');
  const [tipo, setTipo] = useState<TipoAtaque>(alvo.cidade_principal ? 'saque' : 'conquista');
  const [enviar, setEnviar] = useState<Exercito>(exercito());
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const origem = dados.territorios.find((t) => t.id === origemId);
  const disponiveis = dados.minhasTropas.get(origemId) ?? exercito();
  const dono = alvo.dono_id ? dados.jogadores.get(alvo.dono_id) : null;
  const verificacao = verificarAtaque({
    tipo,
    enviar,
    disponiveis,
    origemDoJogador: origem?.dono_id === meuId,
    vizinhos: (dados.vizinhos.get(alvoId) ?? []).includes(origemId),
    alvo: { donoId: alvo.dono_id, cidadePrincipal: alvo.cidade_principal },
    jogadorId: meuId,
    inicioTemporada: dados.temporada.inicio,
    escudoDoAlvoAte: alvo.dono_id ? (dados.escudos.get(alvo.dono_id) ?? null) : null,
    agora,
  });
  const duracao = origem && totalUnidades(enviar) > 0 ? duracaoMarchaMs(origem, alvo, enviar) : null;

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await chamarFuncao('cidade', { acao: 'enviar_marcha', origem_id: origemId, destino_id: alvoId, tipo, tropas: enviar });
      onEnviado(`Tropas a caminho de ${alvo.nome}. O relatório chega quando a batalha acontecer.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o ataque.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-pergaminho-escuro">Atacar</p>
          <h2 className="font-titulo text-xl text-ouro">{alvo.nome}</h2>
          <p className="text-sm text-pergaminho-escuro">
            {dono ? `de ${dono.nome}` : dados.reconhecimentos.has(alvoId) ? 'Neutro, guardado por bárbaros' : 'Neutro, guardado por bárbaros de força desconhecida (mande um batedor)'}
          </p>
        </div>
        <button onClick={onVoltar} className="rounded-md px-2 text-sm text-pergaminho-escuro hover:text-pergaminho">
          ← Voltar
        </button>
      </header>

      {dados.reconhecimentos.get(alvoId) && (
        <InfoReconhecimento
          reconhecimento={dados.reconhecimentos.get(alvoId)!}
          agora={agora}
          nomeDono={dono ? dono.nome : 'Bárbaros'}
        />
      )}

      {origens.length === 0 ? (
        <p className="text-sm text-pergaminho-escuro">
          Você não tem tropas em nenhum território vizinho. Treine tropas no Quartel da sua cidade.
        </p>
      ) : (
        <>
          <label className="block text-sm">
            <span className="mb-1 block text-pergaminho-escuro">Sair de</span>
            <select
              value={origemId}
              onChange={(e) => {
                setOrigemId(e.target.value);
                setEnviar(exercito());
              }}
              className="w-full rounded-lg border border-couro bg-noite/70 px-3 py-2 focus:border-ouro focus:outline-none"
            >
              {origens.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>

          <div role="radiogroup" className="grid grid-cols-2 gap-1 rounded-lg bg-noite/70 p-1">
            {(
              [
                ['saque', '💰 Saque', 'Leva recursos se vencer; as tropas voltam para casa.'],
                ['conquista', '🚩 Conquista', 'Toma o território se vencer com folga (1,5×).'],
              ] as const
            ).map(([valor, rotulo]) => (
              <button
                key={valor}
                role="radio"
                aria-checked={tipo === valor}
                disabled={valor === 'conquista' && alvo.cidade_principal}
                onClick={() => setTipo(valor)}
                className={`rounded-md px-2 py-1.5 text-sm font-medium disabled:opacity-40 ${tipo === valor ? 'bg-couro text-ouro' : 'text-pergaminho-escuro hover:text-pergaminho'}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <p className="text-xs text-pergaminho-escuro">
            {tipo === 'saque'
              ? alvo.cidade_principal
                ? 'Leva até 30% do estoque desprotegido, limitado ao que as tropas carregam.'
                : 'Território sem cidade não tem o que saquear: só mata defensores e volta.'
              : 'Sem folga suficiente, você só derrota os defensores e as tropas voltam.'}
          </p>

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
                  aria-label={`${UNIDADES_INFO[t].plural} para enviar`}
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
            Mandar todas
          </button>

          {duracao !== null && (
            <p className="rounded-lg bg-noite/60 px-3 py-2 text-sm">
              ⏱ Marcha de {formatarDuracao(duracao)} · chega {horario.format(new Date(agora + duracao))}
            </p>
          )}

          {!verificacao.ok && verificacao.motivo !== 'sem_tropas' && (
            <p className="text-sm text-red-300">
              {MENSAGENS_ATAQUE[verificacao.motivo]}
              {verificacao.motivo === 'protecao_iniciante' &&
                ` Libera ${horario.format(new Date(fimProtecaoIniciante(dados.temporada.inicio)))}.`}
            </p>
          )}
          {erro && (
            <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
              {erro}
            </p>
          )}

          <button
            onClick={() => void confirmar()}
            disabled={!verificacao.ok || enviando}
            className="w-full rounded-lg bg-sangue px-3 py-2.5 font-semibold text-pergaminho hover:brightness-110 disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
          >
            {enviando ? 'Enviando…' : `⚔️ Enviar ${totalUnidades(enviar)} ${totalUnidades(enviar) === 1 ? 'soldado' : 'soldados'}`}
          </button>
        </>
      )}
    </div>
  );
}
