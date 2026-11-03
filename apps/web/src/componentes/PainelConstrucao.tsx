import { RECURSOS, TIPOS_ESTRUTURA, custoEstrutura, recursosQueFaltam, tempoEstruturaMs, type TipoEstrutura } from '@terra/regras';
import { useState } from 'react';
import { ESTRUTURAS_INFO, RECURSOS_INFO, formatarDuracao, formatarNumero } from '../lib/textos';
import { useCidade } from '../lib/useCidade';

type Props = {
  territorioId: string;
  meuId: string;
  /** Obra iniciada: mostra o aviso e relê o mapa. */
  onConstruido: (mensagem: string) => void;
};

/** Seção "Construir" de um território do jogador sem estrutura: as três opções com custo, tempo e o que falta. */
export default function PainelConstrucao({ territorioId, meuId, onConstruido }: Props) {
  const { cidade, comandar } = useCidade(meuId);
  const [enviando, setEnviando] = useState<TipoEstrutura | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  async function construir(tipo: TipoEstrutura) {
    setEnviando(tipo);
    setErro(null);
    try {
      await comandar({ acao: 'construir_estrutura', territorio_id: territorioId, tipo });
      onConstruido(`${ESTRUTURAS_INFO[tipo].nome} em construção. Fica pronta em ${formatarDuracao(tempoEstruturaMs(tipo))}.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível construir.');
    } finally {
      setEnviando(null);
    }
  }

  return (
    <section>
      <h3 className="mb-1 text-sm text-pergaminho-escuro">Construir (uma estrutura por território)</h3>
      <p className="mb-2 text-xs text-pergaminho-escuro/80">Se o território for conquistado, a estrutura é destruída.</p>
      <ul className="space-y-2">
        {TIPOS_ESTRUTURA.map((tipo) => {
          const info = ESTRUTURAS_INFO[tipo];
          const custo = custoEstrutura(tipo);
          const faltam = cidade ? recursosQueFaltam(cidade.recursos, custo) : custo;
          const falta = RECURSOS.filter((r) => faltam[r] > 0);
          return (
            <li key={tipo} className="rounded-lg border border-couro bg-noite/50 p-3 text-sm">
              <p className="font-semibold">
                {info.icone} {info.nome}
              </p>
              <p className="mt-0.5 text-xs text-pergaminho-escuro">{info.descricao}</p>
              <p className="mt-1.5 text-xs tabular-nums">
                {RECURSOS.filter((r) => custo[r] > 0)
                  .map((r) => `${formatarNumero(custo[r])} ${RECURSOS_INFO[r].icone}`)
                  .join(' · ')}
                {' · ⏱ '}
                {formatarDuracao(tempoEstruturaMs(tipo))}
              </p>
              {cidade && falta.length > 0 && (
                <p className="mt-1 text-xs text-red-300 tabular-nums">
                  Faltam {falta.map((r) => `${formatarNumero(Math.ceil(faltam[r]))} ${RECURSOS_INFO[r].icone}`).join(' · ')}
                </p>
              )}
              <button
                onClick={() => void construir(tipo)}
                disabled={!cidade || falta.length > 0 || enviando !== null}
                className="mt-2 w-full rounded-lg border border-ouro/60 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:border-couro disabled:text-pergaminho-escuro"
              >
                {enviando === tipo ? 'Construindo…' : `Construir ${info.nome.toLowerCase()}`}
              </button>
            </li>
          );
        })}
      </ul>
      {erro && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {erro}
        </p>
      )}
    </section>
  );
}
