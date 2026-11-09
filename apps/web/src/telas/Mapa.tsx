import { TIPOS_UNIDADE, monopolioComercial, totalUnidades } from '@terra/regras';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import PainelAtaque from '../componentes/PainelAtaque';
import PainelMovimento from '../componentes/PainelMovimento';
import PainelTerritorio from '../componentes/PainelTerritorio';
import CanvasMapa from '../mapa/CanvasMapa';
import { resultadoDaHorda } from '../lib/hordas';
import { COR_NEUTRA, corDoJogador, useMapa } from '../lib/useMapa';
import { UNIDADES_INFO, formatarDuracao } from '../lib/textos';

type Etiqueta = 'legenda' | 'marchas' | 'ameacas';

/** Tela Mapa: carregada sob demanda (o Phaser só baixa quando o jogador abre a aba). */
export default function Mapa({ sessao }: { sessao: Session }) {
  const { dados, erro, recarregar } = useMapa();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [modo, setModo] = useState<'detalhe' | 'ataque' | 'movimento'>('detalhe');
  const [aviso, setAviso] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
  // No celular, legenda, marchas e ameaças ficam recolhidas em etiquetas para não tampar o mapa.
  const [aberto, setAberto] = useState<Etiqueta | null>(null);
  const meuId = sessao.user.id;

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 6000);
    return () => clearTimeout(t);
  }, [aviso]);

  if (erro) return <Aviso texto={erro} />;
  if (dados === undefined) return <Aviso texto="Desenrolando o mapa…" />;
  if (dados === null) return <Aviso texto="Esta temporada ainda não tem mapa. Ele aparece quando a próxima temporada começar." />;

  // Legenda: só quem tem território (ou reserva) nesta temporada.
  const presentes = new Set(dados.territorios.flatMap((t) => [t.dono_id, t.reservado_para]).filter((id): id is string => !!id));
  const legenda = [...presentes].map((id) => dados.jogadores.get(id)).filter((j) => !!j);
  const nomeDe = (id: string) => dados.territorios.find((t) => t.id === id)?.nome ?? '?';
  const proximaChegada = Math.min(...dados.marchas.map((m) => m.chegadaEm));
  const alternar = (qual: Etiqueta) => setAberto((atual) => (atual === qual ? null : qual));
  const ameacas = dados.marchasVistas;
  // Monopólio comercial (aberto a todos): todo mundo vê quem tem todas as cidades livres e quando vence.
  const monopolio = monopolioComercial(
    [...dados.povoados.values()]
      .filter((p) => p.tipo === 'cidade_livre')
      .map((p) => ({ donoId: dados.territorios.find((t) => t.id === p.territorioId)?.dono_id ?? null, posseDesde: p.posseDesde })),
    agora,
  );

  // Horda bárbara: a que vem (todos veem) ou, por 12 h, como terminou a última.
  const horda = dados.hordas[0];
  const recente = horda && (horda.aCaminho || agora - horda.chegadaEm < 12 * 60 * 60 * 1000) ? horda : null;
  const nomeJogador = (id: string | null) => (id === meuId ? 'Você' : id ? (dados.jogadores.get(id)?.nome ?? 'Alguém') : 'ninguém');

  function selecionar(id: string | null) {
    setSelecionado(id);
    setModo('detalhe');
    setAberto(null);
  }

  return (
    <div className="relative h-full overflow-hidden">
      <CanvasMapa dados={dados} meuId={meuId} selecionado={selecionado} onSelecionar={selecionar} />

      <div className="pointer-events-none absolute left-3 top-3 max-w-[calc(100%-1.5rem)] space-y-2 md:max-w-[60%]">
        {monopolio && (
          <p
            role="status"
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur ${monopolio.donoId === meuId ? 'border-ouro bg-noite/90 text-ouro' : 'border-sangue bg-sangue/85 text-pergaminho'}`}
          >
            ⚖️ {monopolio.donoId === meuId ? 'Você tem' : `${dados.jogadores.get(monopolio.donoId)?.nome ?? 'Alguém'} tem`} todas as cidades
            livres: vence em{' '}
            <span className="tabular-nums">{monopolio.venceEm > agora ? formatarDuracao(monopolio.venceEm - agora) : 'instantes'}</span>
          </p>
        )}
        {recente && (
          <p
            role="status"
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold backdrop-blur ${recente.aCaminho ? 'border-[#9b1b30] bg-[#9b1b30]/85 text-pergaminho' : 'border-couro bg-noite/85 text-pergaminho'}`}
          >
            ☠️{' '}
            {recente.aCaminho ? (
              <>
                Horda bárbara ({totalUnidades(recente.tropas)} soldados) a caminho de {nomeDe(recente.territorioId)}
                {(() => {
                  const dono = dados.territorios.find((t) => t.id === recente.territorioId)?.dono_id ?? null;
                  return dono === meuId ? ' (seu)' : dono ? `, de ${nomeJogador(dono)}` : '';
                })()}
                : chega em{' '}
                <span className="tabular-nums">{recente.chegadaEm > agora ? formatarDuracao(recente.chegadaEm - agora) : 'instantes'}</span>
              </>
            ) : (
              resultadoDaHorda(recente, nomeJogador(recente.defensorId), nomeDe(recente.territorioId))
            )}
          </p>
        )}
        <div className="pointer-events-auto flex flex-wrap gap-2 md:hidden">
          {ameacas.length > 0 && (
            <button
              onClick={() => alternar('ameacas')}
              aria-expanded={aberto === 'ameacas'}
              className={`rounded-full border bg-sangue/85 px-3 py-1.5 text-xs font-semibold text-pergaminho backdrop-blur ${aberto === 'ameacas' ? 'border-ouro' : 'border-sangue'}`}
            >
              ⚠️ {ameacas.length} vindo ·{' '}
              <span className="tabular-nums">{ameacas[0]!.chegadaEm > agora ? formatarDuracao(ameacas[0]!.chegadaEm - agora) : 'chegando…'}</span>
            </button>
          )}
          <button
            onClick={() => alternar('legenda')}
            aria-expanded={aberto === 'legenda'}
            className={`flex items-center gap-1.5 rounded-full border bg-noite/85 px-3 py-1.5 text-xs backdrop-blur ${aberto === 'legenda' ? 'border-ouro text-ouro' : 'border-couro'}`}
          >
            <span className="flex -space-x-1">
              {legenda.map((j) => (
                <span key={j.id} className="size-2.5 rounded-full ring-1 ring-noite" style={{ background: corDoJogador(j) }} />
              ))}
            </span>
            Jogadores
          </button>
          {dados.marchas.length > 0 && (
            <button
              onClick={() => alternar('marchas')}
              aria-expanded={aberto === 'marchas'}
              className={`rounded-full border bg-noite/85 px-3 py-1.5 text-xs backdrop-blur ${aberto === 'marchas' ? 'border-ouro text-ouro' : 'border-couro'}`}
            >
              🚩 {dados.marchas.length} {dados.marchas.length === 1 ? 'marcha' : 'marchas'} ·{' '}
              <span className="tabular-nums">{proximaChegada > agora ? formatarDuracao(proximaChegada - agora) : 'chegando…'}</span>
            </button>
          )}
        </div>

        {ameacas.length > 0 && (
          <div
            className={`rounded-lg border border-sangue bg-noite/90 px-3 py-2 text-xs backdrop-blur md:block ${aberto === 'ameacas' ? 'block' : 'hidden'}`}
          >
            <p className="mb-1 font-semibold text-red-300">⚠️ Suas torres avistam</p>
            <ul className="space-y-1">
              {ameacas.map((m) => (
                <li key={m.id}>
                  {dados.jogadores.get(m.jogadorId)?.nome ?? 'Alguém'}:{' '}
                  {m.tipo === 'reconhecimento' ? '🔭 batedor' : `${m.tipo === 'saque' ? '💰' : '🚩'} ${m.soldados} soldados`} → {nomeDe(m.destinoId)}
                  {' · '}
                  <span className="tabular-nums">{m.chegadaEm > agora ? formatarDuracao(m.chegadaEm - agora) : 'chegando…'}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div
          className={`rounded-lg border border-couro bg-noite/85 px-3 py-2 text-xs backdrop-blur md:block ${aberto === 'legenda' ? 'block' : 'hidden'}`}
        >
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {legenda.map((j) => (
              <li key={j.id} className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full" style={{ background: corDoJogador(j) }} />
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

        {dados.marchas.length > 0 && (
          <div
            className={`rounded-lg border border-couro bg-noite/85 px-3 py-2 text-xs backdrop-blur md:block ${aberto === 'marchas' ? 'block' : 'hidden'}`}
          >
            <p className="mb-1 font-semibold text-ouro">Suas marchas</p>
            <ul className="space-y-1">
              {dados.marchas.map((m) => {
                const falta = m.chegadaEm - agora;
                return (
                  <li key={m.id}>
                    {m.tipo === 'reconhecimento' || (m.tipo === 'retorno' && totalUnidades(m.tropas) === 0)
                      ? '🔭'
                      : m.tipo === 'retorno'
                        ? '↩️'
                        : m.tipo === 'movimento'
                          ? '🚶'
                          : m.tipo === 'saque'
                            ? '💰'
                            : '🚩'}{' '}
                    {m.tipo === 'reconhecimento'
                      ? `Batedor indo a ${nomeDe(m.destinoId)}`
                      : m.tipo === 'retorno' && totalUnidades(m.tropas) === 0
                        ? `Batedor voltando de ${nomeDe(m.origemId)}`
                        : m.tipo === 'retorno'
                          ? `Voltando de ${nomeDe(m.origemId)}`
                          : `${nomeDe(m.origemId)} → ${nomeDe(m.destinoId)}`}
                    {' · '}
                    {TIPOS_UNIDADE.filter((t) => m.tropas[t] > 0)
                      .map((t) => `${m.tropas[t]}${UNIDADES_INFO[t].icone}`)
                      .join(' ')}
                    {' · '}
                    <span className="tabular-nums">{falta > 0 ? formatarDuracao(falta) : 'chegando…'}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-1 text-pergaminho-escuro/80">
              {dados.marchas.reduce((soma, m) => soma + totalUnidades(m.tropas), 0)} soldados fora de casa
            </p>
          </div>
        )}
      </div>

      {aviso && (
        <div role="status" className="absolute inset-x-4 top-4 z-10 mx-auto max-w-md rounded-lg border border-musgo bg-[#1f2a17] px-4 py-3 text-sm shadow-xl">
          {aviso}
        </div>
      )}

      {selecionado && (
        <aside className="absolute inset-x-0 bottom-0 max-h-[60%] overflow-y-auto rounded-t-2xl border-t border-couro bg-carvao/95 p-4 backdrop-blur md:inset-x-auto md:bottom-3 md:right-3 md:top-3 md:max-h-none md:w-80 md:rounded-2xl md:border">
          {modo === 'movimento' ? (
            <PainelMovimento
              dados={dados}
              origemId={selecionado}
              meuId={meuId}
              agora={agora}
              onVoltar={() => setModo('detalhe')}
              onEnviado={(mensagem) => {
                setAviso(mensagem);
                selecionar(null);
                void recarregar();
              }}
            />
          ) : modo === 'ataque' ? (
            <PainelAtaque
              dados={dados}
              alvoId={selecionado}
              meuId={meuId}
              agora={agora}
              onVoltar={() => setModo('detalhe')}
              onEnviado={(mensagem) => {
                setAviso(mensagem);
                selecionar(null);
                void recarregar();
              }}
            />
          ) : (
            <PainelTerritorio
              dados={dados}
              id={selecionado}
              meuId={meuId}
              agora={agora}
              onSelecionar={selecionar}
              onAtacar={() => setModo('ataque')}
              onMover={() => setModo('movimento')}
              onBatedorEnviado={(mensagem) => {
                setAviso(mensagem);
                void recarregar();
              }}
              onConstruido={(mensagem) => {
                setAviso(mensagem);
                void recarregar();
              }}
            />
          )}
        </aside>
      )}
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return <div className="grid h-full place-items-center px-6 text-center text-pergaminho-escuro">{texto}</div>;
}
