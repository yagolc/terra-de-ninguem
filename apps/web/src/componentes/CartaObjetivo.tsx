import type { AvaliacaoObjetivo, Objetivo } from '@terra/regras';
import { descreverObjetivo } from '../lib/textos';

type Props = {
  objetivo: Objetivo;
  progresso: AvaliacaoObjetivo | null;
  nomeRegiao: (id: string) => string;
  nomeJogador: (id: string) => string;
  /** Nome do dono, quando a carta é revelada no fim da temporada. */
  dono?: string;
  cumprido?: boolean;
};

/** A carta do objetivo secreto, com a barra de progresso. */
export default function CartaObjetivo({ objetivo, progresso, nomeRegiao, nomeJogador, dono, cumprido }: Props) {
  const carta = descreverObjetivo(objetivo, { regiao: nomeRegiao, jogador: nomeJogador });
  const derrubar = objetivo.tipo === 'derrubar_rival';
  const fracao = progresso ? (derrubar ? (progresso.cumprido ? 1 : 1 / (progresso.atual + 1)) : Math.min(1, progresso.atual / progresso.alvo)) : 0;

  return (
    <article
      className={`rounded-2xl border-2 bg-gradient-to-b from-couro to-carvao p-5 shadow-xl ${cumprido ? 'border-ouro' : 'border-ouro/40'}`}
    >
      {dono && <p className="mb-1 text-xs uppercase tracking-wider text-pergaminho-escuro">Objetivo de {dono}</p>}
      <div className="flex items-start gap-3">
        <span className="text-4xl leading-none" aria-hidden>
          {carta.icone}
        </span>
        <div>
          <h3 className="font-titulo text-lg text-ouro">{carta.titulo}</h3>
          <p className="mt-1 text-sm text-pergaminho">{carta.texto}</p>
        </div>
      </div>
      {cumprido && <p className="mt-3 text-sm font-semibold text-ouro">✓ Cumprido</p>}
      {progresso && !dono && (
        <div className="mt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-noite/70">
            <div className="h-full rounded-full bg-ouro transition-all" style={{ width: `${Math.round(fracao * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-pergaminho-escuro tabular-nums">
            {progresso.cumprido
              ? 'Objetivo cumprido! A vitória é anunciada em até um minuto.'
              : derrubar
                ? progresso.atual === 0
                  ? 'O rival só tem a cidade principal, mas você precisa ter conquistado um território dele.'
                  : `O rival ainda tem ${progresso.atual} ${progresso.atual === 1 ? 'território' : 'territórios'} além da cidade.`
                : `${progresso.atual} de ${progresso.alvo}`}
          </p>
        </div>
      )}
    </article>
  );
}
