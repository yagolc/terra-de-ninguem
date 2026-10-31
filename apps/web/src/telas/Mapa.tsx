import { TIPOS_UNIDADE, totalUnidades } from '@terra/regras';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import PainelAtaque from '../componentes/PainelAtaque';
import PainelMovimento from '../componentes/PainelMovimento';
import PainelTerritorio from '../componentes/PainelTerritorio';
import CanvasMapa from '../mapa/CanvasMapa';
import { COR_NEUTRA, corDoJogador, useMapa } from '../lib/useMapa';
import { UNIDADES_INFO, formatarDuracao } from '../lib/textos';

/** Tela Mapa: carregada sob demanda (o Phaser só baixa quando o jogador abre a aba). */
export default function Mapa({ sessao }: { sessao: Session }) {
  const { dados, erro, recarregar } = useMapa();
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [modo, setModo] = useState<'detalhe' | 'ataque' | 'movimento'>('detalhe');
  const [aviso, setAviso] = useState<string | null>(null);
  const [agora, setAgora] = useState(() => Date.now());
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

  function selecionar(id: string | null) {
    setSelecionado(id);
    setModo('detalhe');
  }

  return (
    <div className="relative h-full overflow-hidden">
      <CanvasMapa dados={dados} meuId={meuId} selecionado={selecionado} onSelecionar={selecionar} />

      <div className="pointer-events-none absolute left-3 top-3 max-w-[60%] space-y-2">
        <div className="rounded-lg border border-couro bg-noite/85 px-3 py-2 text-xs backdrop-blur">
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
          <div className="rounded-lg border border-couro bg-noite/85 px-3 py-2 text-xs backdrop-blur">
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
