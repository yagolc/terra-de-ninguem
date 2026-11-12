import { validadeDaProposta } from '@terra/regras';
import { formatarDuracao } from '../lib/textos';
import type { Carta } from '../lib/useCartas';

const quando = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

type Props = {
  carta: Carta;
  meuId: string;
  nomes: Map<string, string>;
  agora: number;
  ocupado: boolean;
  onResponderPacto: (cartaId: string, aceitar: boolean) => void;
  onEscrever: (paraId: string) => void;
};

/** Uma carta da lista: recebida ou mandada, com a proposta de pacto e a resposta. */
export default function ItemCarta({ carta, meuId, nomes, agora, ocupado, onResponderPacto, onEscrever }: Props) {
  const recebida = carta.destinatarioId === meuId;
  const outro = recebida ? carta.remetenteId : carta.destinatarioId;
  const nomeOutro = nomes.get(outro) ?? 'Jogador';
  const voando = carta.chegaEm > agora;
  const nova = recebida ? !carta.lida : carta.resposta !== null && !carta.respostaVista;
  const validade = validadeDaProposta(carta.chegaEm);
  const podeResponder = recebida && carta.proposta && carta.resposta === null && agora <= validade;

  return (
    <li className={`rounded-xl border bg-carvao/90 p-4 ${nova ? 'border-ouro/60' : 'border-couro'}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl leading-none" aria-hidden>
          {recebida ? '📨' : voando ? '🕊️' : '📤'}
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="font-semibold">
              {recebida ? `De ${nomeOutro}` : `Para ${nomeOutro}`}
              {nova && <span className="ml-2 rounded bg-ouro px-1.5 py-0.5 text-[10px] font-bold text-noite">NOVO</span>}
            </p>
            <p className="text-xs text-pergaminho-escuro">
              {voando
                ? `Voando · chega em ${formatarDuracao(carta.chegaEm - agora)}`
                : `${recebida ? 'Chegou' : 'Entregue'} ${quando.format(new Date(carta.chegaEm))}`}
            </p>
          </div>

          {carta.texto && <p className="whitespace-pre-line break-words text-sm text-pergaminho">{carta.texto}</p>}

          {carta.proposta && (
            <div className="space-y-2 rounded-lg border border-couro bg-noite/60 px-3 py-2 text-sm">
              <p>
                🤝 <b>Pacto de não agressão</b> por {carta.horasPacto} {carta.horasPacto === 1 ? 'hora' : 'horas'}
              </p>
              {carta.resposta === 'aceita' && carta.pactoAte !== null && (
                <p className="text-[#9fd39a]">
                  Aceito.{' '}
                  {carta.pactoAte > agora
                    ? `Vale até ${quando.format(new Date(carta.pactoAte))} (falta ${formatarDuracao(carta.pactoAte - agora)}).`
                    : `Acabou em ${quando.format(new Date(carta.pactoAte))}.`}
                </p>
              )}
              {carta.resposta === 'recusada' && <p className="text-red-300">Recusado.</p>}
              {carta.resposta === null &&
                (podeResponder ? (
                  <div className="space-y-2">
                    <p className="text-xs text-pergaminho-escuro">Responda em até {formatarDuracao(validade - agora)}.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onResponderPacto(carta.id, true)}
                        disabled={ocupado}
                        className="rounded-lg bg-ouro px-3 py-1.5 font-semibold text-noite hover:bg-ouro-claro disabled:opacity-50"
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => onResponderPacto(carta.id, false)}
                        disabled={ocupado}
                        className="rounded-lg border border-couro px-3 py-1.5 text-pergaminho-escuro hover:text-pergaminho disabled:opacity-50"
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-pergaminho-escuro">
                    {voando ? 'Esperando o pombo chegar.' : agora > validade ? 'A proposta expirou sem resposta.' : 'Esperando a resposta.'}
                  </p>
                ))}
            </div>
          )}

          {recebida && (
            <button onClick={() => onEscrever(outro)} className="text-sm text-ouro underline-offset-4 hover:underline">
              ↩️ Responder
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
