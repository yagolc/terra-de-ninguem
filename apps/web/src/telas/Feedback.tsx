import { STATUS_FECHADOS, type TipoReporte } from '@terra/regras';
import { useEffect, useMemo, useState } from 'react';
import CartaoReporte from '../componentes/CartaoReporte';
import FormularioReporte from '../componentes/FormularioReporte';
import { useReportes } from '../lib/reportes';

type Props = {
  meuId: string;
  /** `#feedback=<numero>`: abre esse relato. */
  numeroAberto: number | null;
  /** Aba de onde o jogador veio (vai no contexto do relato de bug). */
  abaDeOrigem: string;
};

type FiltroTipo = 'todos' | TipoReporte | 'meus';
type FiltroStatus = 'abertos' | 'fechados' | 'todos';
type Ordem = 'votos' | 'novos';

const BOTAO = (ativo: boolean) =>
  `rounded-full border px-3 py-1 text-xs ${ativo ? 'border-ouro bg-ouro/10 text-ouro' : 'border-couro text-pergaminho-escuro hover:text-pergaminho'}`;

/**
 * Aba Feedback: relatos de bug e sugestões de todos, com votos, filtros (tipo, abertos/fechados, meus) e ordem
 * (mais votados ou mais novos). O organizador muda o status e responde em cada um.
 */
export default function Feedback({ meuId, numeroAberto, abaDeOrigem }: Props) {
  const { itens, organizador, erro, enviar, votar, atualizar } = useReportes(meuId);
  const [novo, setNovo] = useState<TipoReporte | null>(null);
  const [aberto, setAberto] = useState<number | null>(numeroAberto);
  const [tipo, setTipo] = useState<FiltroTipo>('todos');
  const [status, setStatus] = useState<FiltroStatus>('abertos');
  const [ordem, setOrdem] = useState<Ordem>('votos');

  useEffect(() => setAberto(numeroAberto), [numeroAberto]);

  // Relato aberto pelo endereço (aviso no celular): mostra mesmo fora dos filtros e rola até ele.
  useEffect(() => {
    if (aberto === null || !itens) return;
    document.getElementById(`reporte-${aberto}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [aberto, itens]);

  const lista = useMemo(() => {
    if (!itens) return [];
    return itens
      .filter((i) => i.numero === aberto || tipo === 'todos' || (tipo === 'meus' ? i.jogadorId === meuId : i.tipo === tipo))
      .filter((i) => {
        if (i.numero === aberto || status === 'todos') return true;
        const fechado = STATUS_FECHADOS.includes(i.status);
        return status === 'fechados' ? fechado : !fechado;
      })
      .sort((a, b) => (ordem === 'votos' ? b.votos - a.votos || b.numero - a.numero : b.numero - a.numero));
  }, [itens, tipo, status, ordem, aberto, meuId]);

  function ver(numero: number) {
    setNovo(null);
    setAberto(numero);
    history.replaceState(null, '', `#feedback=${numero}`);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
      <header className="space-y-1">
        <h2 className="font-titulo text-xl text-ouro">💬 Feedback</h2>
        <p className="text-sm text-pergaminho-escuro">
          Achou um bug ou tem uma ideia? Conte aqui. Antes, veja se alguém já contou e vote 👍: os mais votados vêm primeiro.
        </p>
      </header>

      {novo ? (
        <FormularioReporte
          tipo={novo}
          existentes={itens ?? []}
          abaDeOrigem={abaDeOrigem}
          onEnviar={enviar}
          onVer={ver}
          onCancelar={() => setNovo(null)}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setNovo('bug')} className="rounded-lg bg-ouro px-4 py-2 text-sm font-semibold text-noite hover:bg-ouro-claro">
            🐞 Relatar bug
          </button>
          <button onClick={() => setNovo('sugestao')} className="rounded-lg border border-ouro/60 px-4 py-2 text-sm font-semibold text-ouro hover:bg-ouro/10">
            💡 Sugerir ideia
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {(
          [
            ['todos', 'Todos'],
            ['bug', '🐞 Bugs'],
            ['sugestao', '💡 Sugestões'],
            ['meus', 'Meus'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button key={valor} onClick={() => setTipo(valor)} aria-pressed={tipo === valor} className={BOTAO(tipo === valor)}>
            {rotulo}
          </button>
        ))}
        <span className="mx-1 text-couro">|</span>
        {(
          [
            ['abertos', 'Abertos'],
            ['fechados', 'Fechados'],
            ['todos', 'Todos'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button key={valor} onClick={() => setStatus(valor)} aria-pressed={status === valor} className={BOTAO(status === valor)}>
            {rotulo}
          </button>
        ))}
        <span className="mx-1 text-couro">|</span>
        <button onClick={() => setOrdem(ordem === 'votos' ? 'novos' : 'votos')} className={BOTAO(false)}>
          {ordem === 'votos' ? '↓ Mais votados' : '↓ Mais novos'}
        </button>
      </div>

      {erro && <p className="text-sm text-red-300">{erro}</p>}
      {!itens ? (
        <p className="text-sm text-pergaminho-escuro">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-pergaminho-escuro">Nada por aqui com esses filtros.</p>
      ) : (
        <div className="space-y-2">
          {lista.map((item) => (
            <CartaoReporte
              key={`${item.id}-${item.status}-${item.resposta ?? ''}`}
              item={item}
              aberto={aberto === item.numero}
              organizador={organizador}
              onAbrir={() => (aberto === item.numero ? setAberto(null) : ver(item.numero))}
              onVotar={() => void votar(item.id)}
              onAtualizar={(s, r) => atualizar(item.id, s, r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
