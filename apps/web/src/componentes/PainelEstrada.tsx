import { BALANCEAMENTO, RECURSOS, custoEstrada, recursosQueFaltam, tempoEstradaMs } from '@terra/regras';
import { useState } from 'react';
import { RECURSOS_INFO, formatarDuracao, formatarNumero } from '../lib/textos';
import { useCidade } from '../lib/useCidade';
import type { EstradaMapa } from '../lib/useMapa';

type Props = {
  territorioId: string;
  /** Estrada do território, se houver (as estradas são públicas). */
  estrada: EstradaMapa | undefined;
  /** O território é do jogador. */
  meu: boolean;
  meuId: string;
  agora: number;
  /** Obra iniciada: mostra o aviso e relê o mapa. */
  onConstruido: (mensagem: string) => void;
};

const E = BALANCEAMENTO.estrada;

/** Seção "Estrada" do território: a que existe (de qualquer dono) ou, num território do jogador sem estrada, a obra. */
export default function PainelEstrada({ territorioId, estrada, meu, meuId, agora, onConstruido }: Props) {
  const { cidade, comandar } = useCidade(meuId);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (estrada) {
    return (
      <p className="text-sm">
        🛤️ Estrada
        {estrada.prontoEm > agora ? (
          <span className="text-pergaminho-escuro"> · em obra, pronta em {formatarDuracao(estrada.prontoEm - agora)}</span>
        ) : (
          meu && <span className="text-pergaminho-escuro"> · reforços entre territórios seus com estrada andam {E.multiplicadorVelocidade}× mais rápido</span>
        )}
      </p>
    );
  }
  if (!meu) return null;

  const custo = custoEstrada();
  const faltam = cidade ? recursosQueFaltam(cidade.recursos, custo) : custo;
  const falta = RECURSOS.filter((r) => faltam[r] > 0);

  async function construir() {
    setEnviando(true);
    setErro(null);
    try {
      await comandar({ acao: 'construir_estrada', territorio_id: territorioId });
      onConstruido(`Estrada em obra. Fica pronta em ${formatarDuracao(tempoEstradaMs())}.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível fazer a estrada.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="rounded-lg border border-couro bg-noite/50 p-3 text-sm">
      <p className="font-semibold">🛤️ Estrada</p>
      <p className="mt-0.5 text-xs text-pergaminho-escuro">
        Tropas que você move entre dois territórios seus com estrada andam {E.multiplicadorVelocidade}× mais rápido, para reforçar antes
        do ataque chegar. Ataques não usam estrada. Fica à parte da estrutura, todos a veem no mapa e ela é destruída se o território
        for conquistado.
      </p>
      <p className="mt-1.5 text-xs tabular-nums">
        {RECURSOS.filter((r) => custo[r] > 0)
          .map((r) => `${formatarNumero(custo[r])} ${RECURSOS_INFO[r].icone}`)
          .join(' · ')}
        {' · ⏱ '}
        {formatarDuracao(tempoEstradaMs())}
      </p>
      {cidade && falta.length > 0 && (
        <p className="mt-1 text-xs text-red-300 tabular-nums">
          Faltam {falta.map((r) => `${formatarNumero(Math.ceil(faltam[r]))} ${RECURSOS_INFO[r].icone}`).join(' · ')}
        </p>
      )}
      <button
        onClick={() => void construir()}
        disabled={!cidade || falta.length > 0 || enviando}
        className="mt-2 w-full rounded-lg border border-ouro/60 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:border-couro disabled:text-pergaminho-escuro"
      >
        {enviando ? 'Abrindo a estrada…' : 'Fazer estrada'}
      </button>
      {erro && (
        <p role="alert" className="mt-2 text-xs text-red-300">
          {erro}
        </p>
      )}
    </section>
  );
}
