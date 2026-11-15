import { BALANCEAMENTO } from '@terra/regras';
import { useEffect, useState } from 'react';
import Botao from '../componentes/Botao';
import CriarSala from '../componentes/CriarSala';
import JanelaConfirmacao from '../componentes/JanelaConfirmacao';
import { arquivarSala, mudarConvite, novaTemporadaDaSala, partidasEmAndamento, type Sala } from '../lib/salas';
import { supabase } from '../lib/supabase';

type Props = {
  meuId: string;
  salas: Sala[];
  salaAberta: string | null;
  organizador: boolean;
  onAbrir: (id: string) => void;
  /** Algo mudou nas salas (criada, temporada nova, arquivada, convite): recarrega a lista. */
  onMudou: () => void;
};

const dia = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });

/** O que o jogador pode fazer na sala: abrir (já joga ou ver o fim), entrar (fundar) ou o motivo de não poder. */
function situacao(sala: Sala, partidas: number): { botao: string | null; aviso: string | null } {
  const ativa = sala.temporada?.status === 'ativa';
  if (!sala.temporada) return { botao: null, aviso: 'A primeira temporada ainda não começou.' };
  if (!ativa) return { botao: 'Ver resultado', aviso: null };
  if (sala.minhaCidade) return { botao: 'Abrir', aviso: null };
  if (!sala.convidado) return { botao: null, aviso: 'Só para convidados.' };
  if (sala.jogadores >= sala.jogadoresMaximo) return { botao: null, aviso: 'Sala cheia.' };
  if (partidas >= BALANCEAMENTO.salas.partidasPorJogador) {
    return { botao: null, aviso: `Você já joga ${BALANCEAMENTO.salas.partidasPorJogador} partidas. Entre quando uma acabar.` };
  }
  return { botao: 'Entrar', aviso: null };
}

/** Aba Salas (`#salas`, botão 🏰): partidas em paralelo, cada uma com mapa, placar e objetivos próprios. */
export default function Salas({ meuId, salas, salaAberta, organizador, onAbrir, onMudou }: Props) {
  const partidas = partidasEmAndamento(salas);
  const [jogadores, setJogadores] = useState<{ id: string; nome: string }[]>([]);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [arquivar, setArquivar] = useState<Sala | null>(null);

  useEffect(() => {
    if (!organizador || !supabase) return;
    void supabase
      .from('jogadores')
      .select('id, nome')
      .order('nome')
      .returns<{ id: string; nome: string }[]>()
      .then(({ data }) => setJogadores(data ?? []));
  }, [organizador]);

  async function executar(chave: string, acao: () => Promise<unknown>) {
    setOcupado(chave);
    setErro(null);
    try {
      await acao();
      onMudou();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setOcupado(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <header className="space-y-1">
        <h2 className="font-titulo text-xl text-ouro">Salas</h2>
        <p className="text-sm text-pergaminho-escuro">
          Cada sala é uma partida com mapa, placar, objetivos e herdeiro próprios. Cidade, tropas, cartas e pactos de uma não passam para a
          outra; gemas e itens valem em todas. Você joga até {BALANCEAMENTO.salas.partidasPorJogador} partidas ao mesmo tempo (agora:{' '}
          {partidas}).
        </p>
      </header>

      {erro && <p className="rounded-lg border border-sangue/60 bg-sangue/10 px-3 py-2 text-sm">{erro}</p>}

      <ul className="space-y-3">
        {salas.map((sala) => {
          const { botao, aviso } = situacao(sala, partidas);
          const t = sala.temporada;
          const aberta = sala.id === salaAberta;
          return (
            <li key={sala.id} className={`space-y-2 rounded-xl border p-4 ${aberta ? 'border-ouro/70 bg-ouro/5' : 'border-couro bg-noite/50'}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-titulo text-lg text-pergaminho">
                    {sala.nome}
                    {aberta && <span className="ml-2 text-xs text-ouro">aberta agora</span>}
                  </p>
                  <p className="text-sm text-pergaminho-escuro">
                    {t ? `Temporada ${t.numero}` : 'Sem temporada'}
                    {t?.status === 'ativa' && t.fimPrevisto && ` · até ${dia.format(t.fimPrevisto)}`}
                    {t?.status === 'encerrada' && ' · encerrada'}
                    {t?.status === 'ativa' && ` · ${sala.jogadores} de ${sala.jogadoresMaximo} jogadores`}
                    {sala.acesso === 'convite' && ' · só convidados'}
                    {sala.minhaCidade && t?.status === 'ativa' && ' · você joga aqui'}
                  </p>
                </div>
                {botao && !aberta && (
                  <div className="w-32">
                    <Botao variante={botao === 'Entrar' ? 'principal' : 'discreto'} onClick={() => onAbrir(sala.id)}>
                      {botao}
                    </Botao>
                  </div>
                )}
              </div>
              {aviso && <p className="text-sm text-pergaminho-escuro">{aviso}</p>}

              {organizador && !sala.principal && (
                <div className="space-y-2 border-t border-couro/60 pt-2 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {t?.status !== 'ativa' && (
                      <button
                        disabled={ocupado !== null}
                        onClick={() => void executar(`nova-${sala.id}`, () => novaTemporadaDaSala(sala.id, null))}
                        className="rounded-lg border border-couro px-3 py-1.5 text-pergaminho-escuro hover:text-pergaminho disabled:opacity-50"
                      >
                        {ocupado === `nova-${sala.id}` ? 'Gerando o mapa…' : `Começar a temporada ${(t?.numero ?? 0) + 1}`}
                      </button>
                    )}
                    <button
                      disabled={ocupado !== null}
                      onClick={() => setArquivar(sala)}
                      className="rounded-lg border border-couro px-3 py-1.5 text-pergaminho-escuro hover:text-sangue disabled:opacity-50"
                    >
                      Arquivar
                    </button>
                  </div>
                  {sala.acesso === 'convite' && (
                    <fieldset className="space-y-1">
                      <legend className="text-pergaminho-escuro">Convidados</legend>
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {jogadores.map((j) => {
                          const convidado = sala.convidados.includes(j.id);
                          return (
                            <label key={j.id} className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={convidado}
                                disabled={ocupado !== null || j.id === meuId}
                                onChange={() => void executar(`convite-${sala.id}-${j.id}`, () => mudarConvite(sala.id, j.id, !convidado))}
                              />
                              {j.nome}
                            </label>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {organizador && <CriarSala meuId={meuId} jogadores={jogadores} onCriada={onAbrir} />}

      {arquivar && (
        <JanelaConfirmacao
          titulo={`Arquivar ${arquivar.nome}?`}
          confirmar="Arquivar"
          onConfirmar={() => void executar(`arquivar-${arquivar.id}`, () => arquivarSala(arquivar.id))}
          onFechar={() => setArquivar(null)}
        >
          <p className="text-sm">
            A sala some do menu. Se a temporada dela estiver em andamento, ela acaba agora, sem vencedor, e os objetivos ficam públicos. O
            histórico continua no perfil de cada um.
          </p>
        </JanelaConfirmacao>
      )}
    </div>
  );
}
