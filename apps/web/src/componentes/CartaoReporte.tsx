import { STATUS_REPORTE, type StatusReporte } from '@terra/regras';
import { useState } from 'react';
import { AREAS_INFO, GRAVIDADES_INFO, STATUS_INFO, TIPOS_REPORTE_INFO, type ItemReporte } from '../lib/reportes';

type Props = {
  item: ItemReporte;
  aberto: boolean;
  organizador: boolean;
  onAbrir: () => void;
  onVotar: () => void;
  onAtualizar: (status: StatusReporte, resposta: string) => Promise<void>;
};

const data = (ms: number) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function Bloco({ titulo, texto }: { titulo: string; texto: string }) {
  if (!texto) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-pergaminho-escuro">{titulo}</p>
      <p className="whitespace-pre-line break-words text-sm text-pergaminho">{texto}</p>
    </div>
  );
}

/** Um relato na lista: número, tipo, status, votos e, aberto, os detalhes, a resposta e (organizador) o status. */
export default function CartaoReporte({ item, aberto, organizador, onAbrir, onVotar, onAtualizar }: Props) {
  const [status, setStatus] = useState<StatusReporte>(item.status);
  const [resposta, setResposta] = useState(item.resposta ?? '');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const tipo = TIPOS_REPORTE_INFO[item.tipo];

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      await onAtualizar(status, resposta);
      setMensagem('Salvo. Quem relatou recebe um aviso.');
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Não deu certo.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <article id={`reporte-${item.numero}`} className={`rounded-xl border bg-carvao/90 ${aberto ? 'border-ouro/60' : 'border-couro'}`}>
      <div className="flex gap-3 p-3">
        <button
          onClick={onVotar}
          aria-pressed={item.meuVoto}
          title={item.tipo === 'bug' ? 'Também aconteceu comigo' : 'Também quero'}
          className={`flex w-12 shrink-0 flex-col items-center justify-center rounded-lg border text-sm ${item.meuVoto ? 'border-ouro bg-ouro/15 text-ouro' : 'border-couro text-pergaminho-escuro hover:border-ouro/60'}`}
        >
          <span aria-hidden>👍</span>
          <span className="tabular-nums">{item.votos}</span>
        </button>
        <button onClick={onAbrir} aria-expanded={aberto} className="min-w-0 flex-1 text-left">
          <p className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-pergaminho-escuro">#{item.numero}</span>
            <span title={tipo.nome}>{tipo.icone}</span>
            <span className={`rounded-full border px-2 py-0.5 ${STATUS_INFO[item.status].classe}`}>{STATUS_INFO[item.status].nome}</span>
            {item.gravidade && (
              <span className={`rounded-full border px-2 py-0.5 ${GRAVIDADES_INFO[item.gravidade].classe}`}>{GRAVIDADES_INFO[item.gravidade].nome}</span>
            )}
            <span className="text-pergaminho-escuro">{AREAS_INFO[item.area]}</span>
          </p>
          <p className="mt-1 break-words font-semibold text-pergaminho">{item.titulo}</p>
          <p className="text-xs text-pergaminho-escuro">
            {item.autor} · {data(item.criadoEm)}
            {item.resposta && ' · 💬 respondido'}
          </p>
        </button>
      </div>

      {aberto && (
        <div className="space-y-3 border-t border-couro/60 p-3">
          <Bloco titulo="O que aconteceu" texto={item.aconteceu} />
          <Bloco titulo="O que esperava" texto={item.esperado} />
          <Bloco titulo="Passos" texto={item.passos} />
          <Bloco titulo={item.tipo === 'bug' ? 'Detalhes' : 'A ideia'} texto={item.descricao} />
          {item.tipo === 'bug' && Object.keys(item.contexto).length > 0 && (
            <p className="text-xs text-pergaminho-escuro">
              🖥️ {[item.contexto.navegador, item.contexto.sistema, item.contexto.tela, item.contexto.versao && `versão ${item.contexto.versao}`, item.contexto.aba && `aba ${item.contexto.aba}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {item.resposta && (
            <div className="rounded-lg border border-ouro/40 bg-ouro/5 p-3">
              <p className="text-xs font-semibold text-ouro-claro">💬 Resposta do organizador · {data(item.atualizadoEm)}</p>
              <p className="whitespace-pre-line break-words text-sm">{item.resposta}</p>
            </div>
          )}

          {organizador && (
            <div className="space-y-2 rounded-lg border border-couro bg-noite/50 p-3">
              <p className="text-xs font-semibold text-pergaminho-escuro">Organizador</p>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StatusReporte)}
                className="w-full rounded-lg border border-couro bg-noite px-3 py-1.5 text-sm text-pergaminho"
              >
                {STATUS_REPORTE.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_INFO[s].nome}
                  </option>
                ))}
              </select>
              <textarea
                value={resposta}
                onChange={(e) => setResposta(e.target.value)}
                rows={2}
                placeholder="Resposta para o jogador (opcional)"
                className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-sm text-pergaminho focus:border-ouro focus:outline-none"
              />
              <button
                onClick={() => void salvar()}
                disabled={salvando}
                className="rounded-lg border border-ouro/60 px-3 py-1.5 text-xs font-semibold text-ouro hover:bg-ouro/10 disabled:opacity-40"
              >
                {salvando ? 'Salvando…' : 'Salvar status'}
              </button>
              {mensagem && <p className="text-xs text-pergaminho-escuro">{mensagem}</p>}
            </div>
          )}
        </div>
      )}
    </article>
  );
}
