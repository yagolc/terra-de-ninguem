import {
  MENSAGENS_ALOCACAO,
  PREDIO_PRODUTOR,
  RECURSOS,
  habitantesLivres,
  producaoHora,
  vagasTrabalho,
  verificarAlocacao,
  type EstadoCidade,
  type Recursos,
} from '@terra/regras';
import { useEffect, useState } from 'react';
import { PREDIOS, RECURSOS_INFO, formatarTaxa } from '../lib/textos';

type Props = {
  cidade: EstadoCidade;
  ocupado: boolean;
  onSalvar: (alocacao: Recursos) => void;
};

/** Distribui habitantes entre fazenda, serraria e mercado. Cada um é trabalhador ou soldado. */
export default function PainelTrabalhadores({ cidade, ocupado, onSalvar }: Props) {
  const salvo = cidade.trabalhadores;
  const [rascunho, setRascunho] = useState<Recursos>(salvo);

  // Quando o servidor confirma (a cidade é relida), o rascunho volta a refletir o salvo.
  useEffect(() => setRascunho(salvo), [salvo]);

  const vagas = vagasTrabalho(cidade.predios);
  const comRascunho = { ...cidade, trabalhadores: rascunho };
  const producao = producaoHora(comRascunho);
  const livres = habitantesLivres(comRascunho, 0);
  const verificacao = verificarAlocacao({ cidade, alocacao: rascunho, soldados: 0 });
  const mudou = RECURSOS.some((r) => rascunho[r] !== salvo[r]);

  function ajustar(recurso: keyof Recursos, delta: number) {
    setRascunho((atual) => ({ ...atual, [recurso]: Math.max(0, Math.min(vagas[recurso], atual[recurso] + delta)) }));
  }

  return (
    <section className="rounded-xl border border-couro bg-carvao/90 p-4">
      <h2 className="font-titulo text-lg text-ouro">Trabalhadores</h2>
      <p className="mb-3 text-xs text-pergaminho-escuro">
        <span className={livres < 0 ? 'text-red-300' : ''}>{livres} habitantes livres</span> · quem trabalha não luta
      </p>

      <ul className="space-y-2">
        {RECURSOS.map((r) => {
          const predio = PREDIOS[PREDIO_PRODUTOR[r]];
          const semPredio = vagas[r] === 0;
          return (
            <li key={r} className="flex items-center gap-3">
              <span className="text-xl" aria-hidden>
                {predio.icone}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm">{predio.nome}</div>
                <div className="text-xs text-pergaminho-escuro tabular-nums">
                  {semPredio ? 'construa para produzir' : `${formatarTaxa(producao[r])} ${RECURSOS_INFO[r].nome.toLowerCase()}/h`}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  aria-label={`Menos trabalhadores em ${predio.nome}`}
                  onClick={() => ajustar(r, -1)}
                  disabled={semPredio || rascunho[r] === 0}
                  className="size-8 rounded-md border border-couro text-lg leading-none hover:border-ouro/60 disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-12 text-center text-sm tabular-nums">
                  {rascunho[r]}
                  <span className="text-pergaminho-escuro">/{vagas[r]}</span>
                </span>
                <button
                  aria-label={`Mais trabalhadores em ${predio.nome}`}
                  onClick={() => ajustar(r, 1)}
                  disabled={semPredio || rascunho[r] >= vagas[r] || livres <= 0}
                  className="size-8 rounded-md border border-couro text-lg leading-none hover:border-ouro/60 disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {mudou && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setRascunho(salvo)}
            className="flex-1 rounded-lg border border-couro px-3 py-2 text-sm text-pergaminho-escuro hover:text-pergaminho"
          >
            Desfazer
          </button>
          <button
            onClick={() => onSalvar(rascunho)}
            disabled={!verificacao.ok || ocupado}
            className="flex-1 rounded-lg bg-ouro px-3 py-2 text-sm font-semibold text-noite hover:bg-ouro-claro disabled:bg-couro disabled:text-pergaminho-escuro"
          >
            Salvar
          </button>
        </div>
      )}
      {mudou && !verificacao.ok && <p className="mt-2 text-xs text-red-300">{MENSAGENS_ALOCACAO[verificacao.motivo]}</p>}
    </section>
  );
}
