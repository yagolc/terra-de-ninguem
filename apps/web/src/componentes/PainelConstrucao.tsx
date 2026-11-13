import { RECURSOS, TIPOS_ESTRUTURA, custoEstrutura, recursosQueFaltam, tempoEstruturaMs, type TipoEstrutura } from '@terra/regras';
import { useState } from 'react';
import { imagemDaEstrutura } from '../lib/arte';
import { ESTRUTURAS_INFO, RECURSOS_INFO, formatarDuracao, formatarNumero } from '../lib/textos';
import { useCidade } from '../lib/useCidade';
import Ilustracao from './Ilustracao';

type Props = {
  territorioId: string;
  meuId: string;
  /** É a cidade principal (o acampamento militar não vai nela). */
  cidadePrincipal: boolean;
  /** O jogador já tem um acampamento militar (pronto ou em obra). */
  temAcampamento: boolean;
  /** Obra iniciada: mostra o aviso e relê o mapa. */
  onConstruido: (mensagem: string) => void;
};

/** Seção "Construir" de um território do jogador sem estrutura: as opções com custo, tempo e o que falta. */
export default function PainelConstrucao({ territorioId, meuId, cidadePrincipal, temAcampamento, onConstruido }: Props) {
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
      <p className="mb-2 text-xs text-pergaminho-escuro/80">
        Se o território for conquistado, a estrutura é destruída. Você também pode destruir a sua para trocar por outra.
      </p>
      <ul className="space-y-2">
        {TIPOS_ESTRUTURA.map((tipo) => {
          const info = ESTRUTURAS_INFO[tipo];
          const custo = custoEstrutura(tipo);
          const faltam = cidade ? recursosQueFaltam(cidade.recursos, custo) : custo;
          const falta = RECURSOS.filter((r) => faltam[r] > 0);
          const imagem = imagemDaEstrutura(tipo);
          const bloqueio =
            tipo !== 'acampamento'
              ? null
              : cidadePrincipal
                ? 'Só em território conquistado: a cidade já tem o Quartel.'
                : temAcampamento
                  ? 'Você já tem um acampamento militar (um por jogador).'
                  : null;
          return (
            <li key={tipo} className="rounded-lg border border-couro bg-noite/50 p-3 text-sm">
              <div className="flex items-center gap-3">
                {imagem && <Ilustracao src={imagem} className="size-16 shrink-0" />}
                <div>
                  <p className="font-semibold">
                    {!imagem && `${info.icone} `}
                    {info.nome}
                  </p>
                  <p className="mt-0.5 text-xs text-pergaminho-escuro">{info.descricao}</p>
                </div>
              </div>
              <p className="mt-1.5 text-xs tabular-nums">
                {RECURSOS.filter((r) => custo[r] > 0)
                  .map((r) => `${formatarNumero(custo[r])} ${RECURSOS_INFO[r].icone}`)
                  .join(' · ')}
                {' · ⏱ '}
                {formatarDuracao(tempoEstruturaMs(tipo))}
              </p>
              {bloqueio && <p className="mt-1 text-xs text-pergaminho-escuro">{bloqueio}</p>}
              {cidade && !bloqueio && falta.length > 0 && (
                <p className="mt-1 text-xs text-red-300 tabular-nums">
                  Faltam {falta.map((r) => `${formatarNumero(Math.ceil(faltam[r]))} ${RECURSOS_INFO[r].icone}`).join(' · ')}
                </p>
              )}
              <button
                onClick={() => void construir(tipo)}
                disabled={!cidade || !!bloqueio || falta.length > 0 || enviando !== null}
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
