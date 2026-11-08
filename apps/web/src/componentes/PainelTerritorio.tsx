import { BALANCEAMENTO, TIPOS_UNIDADE, estruturaAtiva, totalUnidades } from '@terra/regras';
import { COR_NEUTRA, corDoJogador, type DadosMapa } from '../lib/useMapa';
import { imagemDaEstrutura } from '../lib/arte';
import { ESTRUTURAS_INFO, RACAS_INFO, RECURSOS_INFO, TERRENOS_INFO, TITULO_HERDEIRO, UNIDADES_INFO, formatarDuracao } from '../lib/textos';
import { useState } from 'react';
import { chamarFuncao } from '../lib/funcoes';
import InfoReconhecimento from './InfoReconhecimento';
import PainelConstrucao from './PainelConstrucao';
import PainelPovoado from './PainelPovoado';
import { origensPossiveis } from './PainelAtaque';
import Ilustracao from './Ilustracao';

type Props = {
  dados: DadosMapa;
  id: string;
  meuId: string;
  onSelecionar: (id: string | null) => void;
  onAtacar: () => void;
  onMover: () => void;
  /** Batedor enviado: mostra o aviso e relê o mapa. */
  onBatedorEnviado: (mensagem: string) => void;
  /** Estrutura em construção: mostra o aviso e relê o mapa. */
  onConstruido: (mensagem: string) => void;
  agora: number;
};

/** Detalhes do território tocado no mapa. */
export default function PainelTerritorio({
  dados,
  id,
  meuId,
  onSelecionar,
  onAtacar,
  onMover,
  onBatedorEnviado,
  onConstruido,
  agora,
}: Props) {
  const [enviandoBatedor, setEnviandoBatedor] = useState(false);
  const [erroBatedor, setErroBatedor] = useState<string | null>(null);
  const t = dados.territorios.find((x) => x.id === id);
  if (!t) return null;

  const dono = t.dono_id ? dados.jogadores.get(t.dono_id) : null;
  const reservadoPara = !dono && t.reservado_para ? dados.jogadores.get(t.reservado_para) : null;
  const vizinhos = (dados.vizinhos.get(t.id) ?? []).map((v) => dados.territorios.find((x) => x.id === v)!).filter(Boolean);
  const meu = t.dono_id === meuId;
  const vizinhoDoMeu = !meu && vizinhos.some((v) => v.dono_id === meuId);
  const terreno = TERRENOS_INFO[t.terreno];
  const bonus = Math.round(BALANCEAMENTO.mapa.bonusTerritorio * 100);
  const minhas = dados.minhasTropas.get(t.id);
  const podeAtacar = !meu && origensPossiveis(dados, t.id, meuId).length > 0;
  const fimEscudo = t.dono_id ? dados.escudos.get(t.dono_id) : undefined;
  const escudo = fimEscudo && fimEscudo > agora ? fimEscudo : null;
  const reconhecimento = dados.reconhecimentos.get(t.id);
  const batedorACaminho = dados.marchas.some((m) => m.tipo === 'reconhecimento' && m.destinoId === t.id);
  const estrutura = dados.estruturas.get(t.id);
  const povoado = dados.povoados.get(t.id);
  const racaDono = t.dono_id ? dados.racas.get(t.dono_id) : undefined;
  const torre = meu && estruturaAtiva(estrutura, 'torre', agora);
  const vindo = torre ? dados.marchasVistas.filter((m) => m.destinoId === t.id) : [];

  async function enviarBatedor() {
    // Sai do território próprio vizinho mais perto do alvo.
    const origem = vizinhos
      .filter((v) => v.dono_id === meuId)
      .sort((a, b) => Math.hypot(a.x - t!.x, a.y - t!.y) - Math.hypot(b.x - t!.x, b.y - t!.y))[0];
    if (!origem) return;
    setEnviandoBatedor(true);
    setErroBatedor(null);
    try {
      await chamarFuncao('cidade', { acao: 'enviar_reconhecimento', origem_id: origem.id, destino_id: t!.id });
      onBatedorEnviado(`Batedor a caminho de ${t!.nome}. As informações chegam quando ele voltar.`);
    } catch (e) {
      setErroBatedor(e instanceof Error ? e.message : 'Não foi possível enviar o batedor.');
    } finally {
      setEnviandoBatedor(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-titulo text-xl text-ouro">{t.nome}</h2>
          <p className="text-sm text-pergaminho-escuro">{dados.regioes.get(t.regiao_id)?.nome}</p>
        </div>
        <button
          onClick={() => onSelecionar(null)}
          aria-label="Fechar"
          className="rounded-md px-2 text-xl leading-none text-pergaminho-escuro hover:text-pergaminho"
        >
          ×
        </button>
      </header>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-pergaminho-escuro">Dono</dt>
        <dd className="flex items-center gap-2">
          <span className="size-3 rounded-full" style={{ background: dono ? corDoJogador(dono) : COR_NEUTRA }} />
          <span>
            {dono ? `${dono.nome}${meu ? ' (você)' : ''}` : 'Neutro, guardado por bárbaros'}
            {dono && racaDono && (
              <span className="text-pergaminho-escuro">
                {' '}
                · {RACAS_INFO[racaDono].icone} {RACAS_INFO[racaDono].nome}
              </span>
            )}
            {dono && dono.id === dados.herdeiroId && <span className="block text-xs text-ouro-claro">👑 {TITULO_HERDEIRO}</span>}
          </span>
        </dd>
        {(t.cidade_principal || reservadoPara) && (
          <>
            <dt className="text-pergaminho-escuro">Cidade</dt>
            <dd>
              {t.cidade_principal
                ? '🏰 Cidade principal: pode ser saqueada, nunca conquistada'
                : `Reservado para ${reservadoPara!.nome}, que ainda não entrou`}
            </dd>
          </>
        )}
        <dt className="text-pergaminho-escuro">Terreno</dt>
        <dd>
          {terreno.icone} {terreno.nome}: {terreno.efeito}
        </dd>
        <dt className="text-pergaminho-escuro">Bônus</dt>
        <dd>
          +{estruturaAtiva(estrutura, 'entreposto', agora) ? bonus * BALANCEAMENTO.multiplicadorEntreposto : bonus}% de{' '}
          {RECURSOS_INFO[t.bonus_recurso].nome.toLowerCase()} para o dono
        </dd>
        {estrutura && (
          <>
            <dt className="text-pergaminho-escuro">Estrutura</dt>
            {estrutura.tipo ? (
              <dd className="flex items-center gap-2">
                {imagemDaEstrutura(estrutura.tipo) && (
                  <Ilustracao
                    src={imagemDaEstrutura(estrutura.tipo)!}
                    className={`size-14 shrink-0 ${estrutura.prontoEm > agora ? 'opacity-50 grayscale' : ''}`}
                  />
                )}
                <span>
                  {ESTRUTURAS_INFO[estrutura.tipo].icone} {ESTRUTURAS_INFO[estrutura.tipo].nome}
                  {estrutura.prontoEm > agora && (
                    <span className="text-pergaminho-escuro"> · em construção, pronta em {formatarDuracao(estrutura.prontoEm - agora)}</span>
                  )}
                  <span className="block text-xs text-pergaminho-escuro">{ESTRUTURAS_INFO[estrutura.tipo].descricao}</span>
                </span>
              </dd>
            ) : (
              <dd>
                ❓ Desconhecida
                <span className="block text-xs text-pergaminho-escuro">
                  Pode ser torre, paliçada ou entreposto. Mande um batedor para descobrir.
                </span>
              </dd>
            )}
          </>
        )}
      </dl>

      {dados.heroi?.territorioId === t.id && (
        <p className="rounded-lg border border-ouro/40 bg-ouro/5 px-3 py-2 text-sm">
          🎖️ {dados.heroi.nome}, seu herói, está aqui. Para levá-lo, marque a opção ao mandar tropas daqui.
        </p>
      )}

      {povoado && <PainelPovoado povoado={povoado} donoId={t.dono_id} meuId={meuId} onMelhorado={onConstruido} agora={agora} />}

      {torre && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${vindo.length > 0 ? 'border-sangue/70 bg-sangue/15' : 'border-couro bg-noite/60'}`}>
          <p className="font-semibold">{vindo.length > 0 ? '⚠️ A torre avista marchas vindo' : '🗼 A torre não avista ninguém vindo'}</p>
          <ul className="mt-1 space-y-1">
            {vindo.map((m) => (
              <li key={m.id} className="text-xs">
                {dados.jogadores.get(m.jogadorId)?.nome ?? 'Alguém'}:{' '}
                {m.tipo === 'reconhecimento'
                  ? '🔭 batedor'
                  : `${m.tipo === 'saque' ? '💰 saque' : '🚩 conquista'} com ${m.soldados} ${m.soldados === 1 ? 'soldado' : 'soldados'}`}{' '}
                vindo de {dados.territorios.find((x) => x.id === m.origemId)?.nome ?? '?'} · chega em{' '}
                <span className="tabular-nums">{m.chegadaEm > agora ? formatarDuracao(m.chegadaEm - agora) : 'instantes'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {minhas && totalUnidades(minhas) > 0 && (
        <div className="rounded-lg bg-noite/60 px-3 py-2 text-sm">
          <span className="text-pergaminho-escuro">Suas tropas aqui: </span>
          {TIPOS_UNIDADE.filter((tipo) => minhas[tipo] > 0)
            .map((tipo) => `${UNIDADES_INFO[tipo].icone} ${minhas[tipo]} ${UNIDADES_INFO[tipo].plural.toLowerCase()}`)
            .join(' · ')}
          <button
            onClick={onMover}
            className="mt-2 w-full rounded-lg border border-ouro/60 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/10"
          >
            🚶 Mover tropas daqui
          </button>
        </div>
      )}

      {meu && !estrutura && <PainelConstrucao territorioId={t.id} meuId={meuId} onConstruido={onConstruido} />}

      <div>
        <h3 className="mb-1.5 text-sm text-pergaminho-escuro">Vizinhos ({vizinhos.length})</h3>
        <ul className="flex flex-wrap gap-1.5">
          {vizinhos.map((v) => {
            const donoVizinho = v.dono_id ? dados.jogadores.get(v.dono_id) : null;
            const corVizinho = donoVizinho ? corDoJogador(donoVizinho) : null;
            return (
              <li key={v.id}>
                <button
                  onClick={() => onSelecionar(v.id)}
                  className="flex items-center gap-1.5 rounded-md border border-couro px-2 py-1 text-xs hover:border-ouro/60"
                >
                  <span className="size-2 rounded-full" style={{ background: corVizinho ?? COR_NEUTRA }} />
                  {v.nome}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {!meu && reconhecimento && (
        <InfoReconhecimento
          reconhecimento={reconhecimento}
          agora={agora}
          nomeDono={reconhecimento.donoId ? (dados.jogadores.get(reconhecimento.donoId)?.nome ?? 'Defensor') : 'Bárbaros'}
          cidadeLivre={povoado?.tipo === 'cidade_livre'}
          racaDono={reconhecimento.donoId ? dados.racas.get(reconhecimento.donoId) : undefined}
        />
      )}

      {!meu && vizinhoDoMeu && (
        <div>
          <button
            onClick={() => void enviarBatedor()}
            disabled={enviandoBatedor || batedorACaminho}
            className="w-full rounded-lg border border-[#c39bd3]/70 px-3 py-2 text-sm font-semibold text-[#d9b8e6] hover:bg-[#c39bd3]/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {batedorACaminho
              ? '🔭 Batedor a caminho…'
              : `🔭 ${reconhecimento ? 'Mandar outro batedor' : 'Enviar batedor'} (${BALANCEAMENTO.reconhecimento.custoOuro} 🪙)`}
          </button>
          {erroBatedor && <p className="mt-1.5 text-xs text-red-300">{erroBatedor}</p>}
        </div>
      )}

      {!meu && (
        <div>
          <button
            onClick={onAtacar}
            disabled={!podeAtacar}
            className="w-full rounded-lg bg-sangue px-3 py-2 text-sm font-semibold text-pergaminho hover:brightness-110 disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
          >
            ⚔️ Atacar
          </button>
          <p className="mt-1.5 text-xs text-pergaminho-escuro">
            {!vizinhoDoMeu
              ? 'Só dá para atacar territórios vizinhos aos seus.'
              : !podeAtacar
                ? 'Faz fronteira com você, mas não há tropas suas nos territórios vizinhos.'
                : escudo
                  ? `${dono?.nome} está com escudo por mais ${formatarDuracao(escudo - agora)}.`
                  : 'Faz fronteira com você.'}
          </p>
        </div>
      )}
    </div>
  );
}
