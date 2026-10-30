import type { Session } from '@supabase/supabase-js';
import { useState } from 'react';
import DetalheRelatorio from '../componentes/DetalheRelatorio';
import { useRelatorios, type Relatorio } from '../lib/useRelatorios';

const quando = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Tela Relatórios: batalhas em que o jogador atacou ou foi atacado, da mais recente para a mais antiga. */
export default function Relatorios({ sessao }: { sessao: Session }) {
  const { estado, erro } = useRelatorios();
  const [aberto, setAberto] = useState<string | null>(null);
  const meuId = sessao.user.id;

  if (erro) return <p className="p-6 text-center text-pergaminho-escuro">{erro}</p>;
  if (!estado) return <p className="p-6 text-center text-pergaminho-escuro">Buscando os relatórios…</p>;

  const { relatorios, nomesTerritorios, nomesJogadores } = estado;
  const nomeTerritorio = (id: string) => nomesTerritorios.get(id) ?? 'território desconhecido';
  const nomeDefensor = (r: Relatorio) => (r.defensor_id ? (nomesJogadores.get(r.defensor_id) ?? 'Defensor') : 'Bárbaros');

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h2 className="mb-4 font-titulo text-lg text-ouro">Relatórios de batalha</h2>
      {relatorios.length === 0 ? (
        <p className="rounded-xl border border-couro bg-carvao/90 p-4 text-sm text-pergaminho-escuro">
          Nenhuma batalha ainda. Quando você atacar (ou for atacado), o resultado aparece aqui.
        </p>
      ) : (
        <ul className="space-y-2">
          {relatorios.map((r) => {
            const souAtacante = r.atacante_id === meuId;
            const venci = (r.vencedor === 'atacante') === souAtacante;
            const naoLido = souAtacante ? !r.lido_atacante : !r.lido_defensor;
            const titulo = souAtacante
              ? `${r.tipo === 'saque' ? 'Saque' : 'Ataque'} a ${nomeTerritorio(r.territorio_id)}`
              : `${nomesJogadores.get(r.atacante_id) ?? 'Alguém'} atacou ${nomeTerritorio(r.territorio_id)}`;
            const resumo = r.conquistou
              ? souAtacante
                ? 'Território conquistado!'
                : 'Você perdeu o território.'
              : venci
                ? souAtacante
                  ? r.tipo === 'conquista'
                    ? 'Vitória, mas sem folga para conquistar.'
                    : 'Vitória.'
                  : 'Defesa vitoriosa.'
                : souAtacante
                  ? 'Derrota: os sobreviventes voltam para casa.'
                  : 'Defesa derrotada. Você ganhou um escudo.';
            return (
              <li key={r.id} className={`rounded-xl border bg-carvao/90 ${naoLido ? 'border-ouro/60' : 'border-couro'}`}>
                <button onClick={() => setAberto(aberto === r.id ? null : r.id)} className="flex w-full items-start gap-3 p-4 text-left">
                  <span className="text-2xl leading-none" aria-hidden>
                    {souAtacante ? '⚔️' : '🛡️'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {titulo}
                      {naoLido && <span className="ml-2 rounded bg-ouro px-1.5 py-0.5 text-[10px] font-bold text-noite">NOVO</span>}
                    </span>
                    <span className={`block text-sm ${venci ? 'text-[#9fd39a]' : 'text-red-300'}`}>{resumo}</span>
                    <span className="block text-xs text-pergaminho-escuro">
                      {quando.format(new Date(r.criado_em))} · saindo de {nomeTerritorio(r.origem_id)}
                    </span>
                  </span>
                  <span className="text-pergaminho-escuro">{aberto === r.id ? '▲' : '▼'}</span>
                </button>
                {aberto === r.id && (
                  <div className="border-t border-couro px-4 pb-4 pt-3">
                    <DetalheRelatorio relatorio={r} nomeDefensor={nomeDefensor(r)} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
