import { BALANCEAMENTO, type AvaliacaoObjetivo, type Objetivo } from '@terra/regras';
import { descreverObjetivo, formatarNumero } from '../lib/textos';

type Props = {
  objetivo: Objetivo;
  progresso: AvaliacaoObjetivo | null;
  nomeRegiao: (id: string) => string;
  nomeJogador: (id: string) => string;
  /** Nome do dono, quando a carta é revelada no fim da temporada. */
  dono?: string;
  cumprido?: boolean;
};

/** Linha abaixo da barra de progresso, para os objetivos que não são só "X de Y". */
function textoProgresso(objetivo: Objetivo, progresso: AvaliacaoObjetivo): string {
  const prontos = progresso.partes?.[0];
  if (objetivo.tipo === 'mestre_construtor' && prontos) {
    return `${prontos.atual} de ${prontos.alvo} prédios no nível ${objetivo.nivel} · ${progresso.atual} de ${progresso.alvo} níveis`;
  }
  if (objetivo.tipo === 'senhor_das_vilas' && prontos) {
    return `${prontos.atual} de ${prontos.alvo} vilas no nível ${objetivo.nivel} · ${progresso.atual} de ${progresso.alvo} níveis`;
  }
  if (objetivo.tipo === 'territorios_defendidos' && prontos) {
    return `${progresso.atual} de ${progresso.alvo} territórios guarnecidos · Muralha ${prontos.atual} de ${prontos.alvo}`;
  }
  if (objetivo.tipo === 'monopolio_comercial' && prontos) {
    return prontos.atual < prontos.alvo
      ? `${prontos.atual} de ${prontos.alvo} cidades livres são suas`
      : `Todas as cidades livres são suas · ${progresso.atual} de ${progresso.alvo} h`;
  }
  return `${formatarNumero(progresso.atual)} de ${formatarNumero(progresso.alvo)}`;
}

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
              ? `Objetivo cumprido! Mantenha por ${BALANCEAMENTO.objetivos.segurarHoras} h seguidas para vencer. Todos veem o relógio, e você fica sem escudo até lá.`
              : derrubar
                ? progresso.atual === 0
                  ? 'O rival só tem a cidade principal, mas você precisa ter conquistado um território dele.'
                  : `O rival ainda tem ${progresso.atual} ${progresso.atual === 1 ? 'território' : 'territórios'} além da cidade.`
                : textoProgresso(objetivo, progresso)}
          </p>
        </div>
      )}
    </article>
  );
}
