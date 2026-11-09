import {
  BALANCEAMENTO,
  MENSAGENS_ATAQUE,
  TIPOS_UNIDADE,
  bonusHeroi,
  duracaoMarchaMs,
  efeitosRaca,
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
import OpcaoHeroi from './OpcaoHeroi';
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

/** Um dos dois botões de envio (saquear ou conquistar), com o que ele faz logo abaixo do rótulo. */
function BotaoAtaque(props: {
  icone: string;
  rotulo: string;
  explicacao: string;
  enviando: boolean;
  disabled: boolean;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      onClick={props.onClick}
      disabled={props.disabled}
      className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2.5 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100 ${props.className}`}
    >
      <span aria-hidden className="text-xl leading-none">
        {props.icone}
      </span>
      <span className="font-semibold">{props.enviando ? 'Enviando…' : props.rotulo}</span>
      <span className="text-[11px] leading-tight opacity-80">{props.explicacao}</span>
    </button>
  );
}

const horario = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });

export default function PainelAtaque({ dados, alvoId, meuId, agora, onVoltar, onEnviado }: Props) {
  const alvo = dados.territorios.find((t) => t.id === alvoId)!;
  const origens = origensPossiveis(dados, alvoId, meuId);
  const [origemId, setOrigemId] = useState(origens[0]?.id ?? '');
  const [enviar, setEnviar] = useState<Exercito>(exercito());
  const [enviando, setEnviando] = useState<TipoAtaque | null>(null);
  const [levarHeroi, setLevarHeroi] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const origem = dados.territorios.find((t) => t.id === origemId);
  const disponiveis = dados.minhasTropas.get(origemId) ?? exercito();
  const dono = alvo.dono_id ? dados.jogadores.get(alvo.dono_id) : null;
  // Estrutura secreta que o batedor ainda não viu (ou que apareceu depois que ele passou).
  const estruturaDesconhecida = !!dados.estruturas.get(alvoId) && !dados.reconhecimentos.get(alvoId)?.estrutura;
  const fimMeuEscudo = dados.escudos.get(meuId);
  const meuEscudo = fimMeuEscudo !== undefined && fimMeuEscudo > agora ? fimMeuEscudo : null;
  // Saque e conquista têm as mesmas regras, menos a cidade principal (só saque): a de saque vale para os dois botões.
  const verificacao = verificarAtaque({
    tipo: 'saque',
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
  const heroi = dados.heroi;
  const comHeroi = levarHeroi && heroi?.territorioId === origemId;
  // Raça (o anão anda mais devagar) mais o herói desbravador.
  const bonusVelocidade =
    efeitosRaca(dados.racas.get(meuId)).velocidade + (comHeroi && heroi.especialidade === 'desbravador' ? bonusHeroi(heroi.nivel, 'desbravador') : 0);
  const duracao = origem && totalUnidades(enviar) > 0 ? duracaoMarchaMs(origem, alvo, enviar, bonusVelocidade) : null;

  const povoado = dados.povoados.get(alvoId);
  const textoSaque = alvo.cidade_principal
    ? 'Leva até 30% do estoque desprotegido da cidade, até o que as tropas carregam.'
    : povoado?.tipo === 'vila'
      ? alvo.dono_id
        ? 'Leva parte do que foi investido na vila e a derruba ao nível 0.'
        : 'Leva o estoque da vila, até o que as tropas carregam.'
      : 'Aqui não há o que levar: só derrota os defensores.';
  const soldados = totalUnidades(enviar);

  async function confirmar(tipo: TipoAtaque) {
    setEnviando(tipo);
    setErro(null);
    try {
      await chamarFuncao('cidade', {
        acao: 'enviar_marcha',
        origem_id: origemId,
        destino_id: alvoId,
        tipo,
        tropas: enviar,
        com_heroi: comHeroi,
      });
      onEnviado(
        `${tipo === 'saque' ? '💰 Saque' : '🚩 Conquista'}: tropas a caminho de ${alvo.nome}. O relatório chega quando a batalha acontecer.`,
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível enviar o ataque.');
    } finally {
      setEnviando(null);
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
          cidadeLivre={dados.povoados.get(alvoId)?.tipo === 'cidade_livre'}
          racaDono={alvo.dono_id ? dados.racas.get(alvo.dono_id) : undefined}
        />
      )}
      {estruturaDesconhecida && (
        <p className="rounded-lg bg-noite/60 px-3 py-2 text-sm">
          ❓ Este território tem uma estrutura que você não conhece. Se for uma paliçada, a defesa ganha +
          {Math.round(BALANCEAMENTO.bonusPalicada * 100)}%. Mande um batedor para descobrir.
        </p>
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

          <OpcaoHeroi heroi={heroi} origemId={origemId} agora={agora} marcado={levarHeroi} onMudar={setLevarHeroi} />

          {duracao !== null && (
            <p className="rounded-lg bg-noite/60 px-3 py-2 text-sm">
              ⏱ Marcha de {formatarDuracao(duracao)} · chega {horario.format(new Date(agora + duracao))}
            </p>
          )}

          {meuEscudo !== null && (
            <p className="rounded-lg border border-ouro/40 bg-ouro/10 px-3 py-2 text-sm text-ouro-claro">
              🛡️ Você está com escudo por mais {formatarDuracao(meuEscudo - agora)}. Atacar quebra o seu escudo.
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

          <p className="text-xs text-pergaminho-escuro">
            Mandando {soldados} {soldados === 1 ? 'soldado' : 'soldados'}. Escolha o que eles vão fazer:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <BotaoAtaque
              icone="💰"
              rotulo="Saquear"
              explicacao={`${textoSaque} As tropas voltam para casa.`}
              enviando={enviando === 'saque'}
              disabled={!verificacao.ok || enviando !== null}
              onClick={() => void confirmar('saque')}
              className="bg-couro text-ouro-claro"
            />
            <BotaoAtaque
              icone="🚩"
              rotulo="Conquistar"
              explicacao={
                alvo.cidade_principal
                  ? 'Cidade principal nunca é conquistada.'
                  : 'Toma o território se vencer com folga (1,5×). Sem folga, só derrota os defensores e volta.'
              }
              enviando={enviando === 'conquista'}
              disabled={!verificacao.ok || enviando !== null || alvo.cidade_principal}
              onClick={() => void confirmar('conquista')}
              className="bg-sangue text-pergaminho"
            />
          </div>
        </>
      )}
    </div>
  );
}
