import { BALANCEAMENTO, MENSAGENS_CARTA, duracaoVooMs, pombosDoPombal, verificarCarta } from '@terra/regras';
import { useState } from 'react';
import { chamarFuncao } from '../lib/funcoes';
import { formatarDuracao } from '../lib/textos';
import type { Correspondente } from '../lib/useCartas';

const P = BALANCEAMENTO.pombos;

type Props = {
  meuId: string;
  correspondentes: Correspondente[];
  minhaCidade: { x: number; y: number } | null;
  nivelPombal: number;
  /** Cartas do jogador ainda voando (cada uma ocupa um pombo). */
  emVoo: number;
  /** Destinatário já escolhido (Responder, ou "Enviar carta" no perfil). */
  para: string | null;
  onEnviada: () => void;
  onFechar: () => void;
};

/** Escrever uma carta: para quem, o texto e, se quiser, uma proposta de pacto de não agressão. */
export default function FormularioCarta({ meuId, correspondentes, minhaCidade, nivelPombal, emVoo, para, onEnviada, onFechar }: Props) {
  const [destinatarioId, setDestinatarioId] = useState(para ?? '');
  const [texto, setTexto] = useState('');
  const [propor, setPropor] = useState(false);
  const [horas, setHoras] = useState(6);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const destino = correspondentes.find((c) => c.id === destinatarioId);
  const v = verificarCarta({
    nivelPombal,
    emVoo,
    remetenteId: meuId,
    destinatarioId,
    destinatarioNaTemporada: !!destino,
    texto,
    proposta: propor ? 'nao_agressao' : null,
    horasPacto: propor ? horas : null,
  });
  const voo = destino?.cidade && minhaCidade ? duracaoVooMs(minhaCidade, destino.cidade, nivelPombal) : null;
  // Motivos que dependem só do que o jogador ainda vai escrever não aparecem como erro.
  const aviso = !v.ok && v.motivo !== 'carta_vazia' && v.motivo !== 'destinatario_invalido' ? MENSAGENS_CARTA[v.motivo] : null;

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      await chamarFuncao('cidade', {
        acao: 'enviar_carta',
        destinatario_id: destinatarioId,
        texto,
        ...(propor ? { proposta: 'nao_agressao', horas_pacto: horas } : {}),
      });
      onEnviada();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível mandar a carta.');
      setEnviando(false);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-ouro/50 bg-carvao/90 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-titulo text-lg text-ouro">🕊️ Nova carta</h3>
        <button onClick={onFechar} className="text-sm text-pergaminho-escuro hover:text-pergaminho">
          Fechar
        </button>
      </div>

      <label className="block space-y-1">
        <span className="text-sm text-pergaminho-escuro">Para</span>
        <select
          value={destinatarioId}
          onChange={(e) => setDestinatarioId(e.target.value)}
          className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-pergaminho focus:border-ouro focus:outline-none"
        >
          <option value="">Escolha um jogador…</option>
          {correspondentes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="flex justify-between text-sm text-pergaminho-escuro">
          <span>Carta</span>
          <span className={texto.length > P.tamanhoTexto ? 'text-red-300' : ''}>
            {texto.length}/{P.tamanhoTexto}
          </span>
        </span>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={5}
          placeholder="Escreva sua mensagem…"
          className="w-full resize-y rounded-lg border border-couro bg-noite px-3 py-2 text-pergaminho focus:border-ouro focus:outline-none"
        />
      </label>

      <div className="space-y-2 rounded-lg border border-couro bg-noite/60 p-3">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={propor} onChange={(e) => setPropor(e.target.checked)} className="mt-1 accent-[#d4a64a]" />
          <span>
            <b>🤝 Propor pacto de não agressão</b>
            <span className="block text-xs text-pergaminho-escuro">
              Se aceitar, nenhum dos dois pode atacar o outro enquanto o pacto durar. Marchas que já estavam a caminho voltam sem lutar.
              A proposta vale por {P.pacto.validadePropostaHoras} h depois de chegar.
            </span>
          </span>
        </label>
        {propor && (
          <label className="flex items-center gap-2 pl-6 text-sm">
            Duração:
            <select
              value={horas}
              onChange={(e) => setHoras(Number(e.target.value))}
              className="rounded-lg border border-couro bg-noite px-2 py-1 text-pergaminho focus:border-ouro focus:outline-none"
            >
              {Array.from({ length: P.pacto.horasMaximas - P.pacto.horasMinimas + 1 }, (_, i) => P.pacto.horasMinimas + i).map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? 'hora' : 'horas'}
                </option>
              ))}
            </select>
            <span className="text-xs text-pergaminho-escuro">a partir do aceite</span>
          </label>
        )}
      </div>

      <p className="text-xs text-pergaminho-escuro">
        🕊️ Pombos livres: {Math.max(0, pombosDoPombal(nivelPombal) - emVoo)} de {pombosDoPombal(nivelPombal)}
        {voo !== null && ` · chega em ${formatarDuracao(voo)}`}
      </p>
      {(erro ?? aviso) && (
        <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
          {erro ?? aviso}
        </p>
      )}
      <button
        onClick={() => void enviar()}
        disabled={!v.ok || enviando}
        className="w-full rounded-lg bg-ouro px-4 py-2.5 font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
      >
        {enviando ? 'Soltando o pombo…' : 'Mandar a carta'}
      </button>
    </section>
  );
}
