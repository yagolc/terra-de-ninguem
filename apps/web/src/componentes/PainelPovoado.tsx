import { BALANCEAMENTO, RECURSOS, custoNivelVila, estoqueVila, povoadoLeal, recursosQueFaltam, vilaCheiaEm } from '@terra/regras';
import { useState } from 'react';
import { RECURSOS_INFO, formatarDuracao, formatarNumero } from '../lib/textos';
import { useCidade } from '../lib/useCidade';
import type { PovoadoMapa } from '../lib/useMapa';

type Props = {
  povoado: PovoadoMapa;
  /** Dono do território (e do povoado); null = neutro. */
  donoId: string | null;
  meuId: string;
  /** Vila melhorada: mostra o aviso e relê o mapa. */
  onMelhorado: (mensagem: string) => void;
  agora: number;
};

const P = BALANCEAMENTO.povoados;

/** Seção de vila ou cidade livre no painel do território: estoque, nível, lealdade e bônus. */
export default function PainelPovoado({ povoado, donoId, meuId, onMelhorado, agora }: Props) {
  const meu = donoId === meuId;
  const { cidade, comandar } = useCidade(meuId);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const leal = povoadoLeal(povoado.lealDesde, agora);

  async function melhorar() {
    setEnviando(true);
    setErro(null);
    try {
      await comandar({ acao: 'melhorar_vila', territorio_id: povoado.territorioId });
      onMelhorado(`Vila melhorada para o nível ${povoado.nivel + 1}.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível melhorar a vila.');
    } finally {
      setEnviando(false);
    }
  }

  const lealdade = donoId && !leal && povoado.lealDesde !== null && (
    <p className="text-xs text-ouro-claro">
      ⏳ Ainda leal ao antigo dono: o bônus começa em {formatarDuracao(povoado.lealDesde - agora)}.
    </p>
  );

  if (povoado.tipo === 'cidade_livre') {
    return (
      <section className="space-y-1.5 rounded-lg border border-ouro/50 bg-ouro/5 p-3 text-sm">
        <h3 className="font-semibold text-ouro">⚖️ Cidade livre</h3>
        <p>
          +{P.cidadeLivre.ouroHora} {RECURSOS_INFO.ouro.icone} por hora para quem a controla. Muralha própria: +
          {Math.round(P.cidadeLivre.bonusDefesa * 100)}% de defesa.
        </p>
        {!povoado.miliciaEntregue && (
          <p className="text-xs text-pergaminho-escuro">
            Na primeira conquista, {P.cidadeLivre.milicia} lanceiros de milícia juram lealdade a quem conquistar e ficam lá defendendo, sem
            ocupar população nem comer.
          </p>
        )}
        {donoId && povoado.milicia > 0 && (
          <p className="text-xs">
            🛡️ {povoado.milicia} {povoado.milicia === 1 ? 'lanceiro' : 'lanceiros'} de milícia defendem a cidade (não ocupam população,
            não comem e não marcham; se dispersam se ela for tomada).
          </p>
        )}
        <p className="text-xs text-pergaminho-escuro">Quem tiver todas as cidades livres por {BALANCEAMENTO.objetivos.monopolioHoras} h tem o monopólio comercial.</p>
        {lealdade}
      </section>
    );
  }

  if (!donoId) {
    const estoque = estoqueVila(povoado.saqueadaEm, agora);
    const cheiaEm = vilaCheiaEm(povoado.saqueadaEm, agora);
    return (
      <section className="space-y-1.5 rounded-lg border border-couro bg-noite/50 p-3 text-sm">
        <h3 className="font-semibold text-ouro">🏘️ Vila neutra</h3>
        <p className="tabular-nums">
          Para saquear agora:{' '}
          {RECURSOS.map((r) => `${formatarNumero(estoque[r])} ${RECURSOS_INFO[r].icone}`).join(' · ')}
          {cheiaEm > agora && <span className="text-pergaminho-escuro"> · cheia em {formatarDuracao(cheiaEm - agora)}</span>}
        </p>
        <p className="text-xs text-pergaminho-escuro">
          O saque leva tudo que couber na carga, e o estoque volta a encher em {P.vila.horasParaEncher} h. Conquistada, vira sua no
          nível 1: +{P.vila.populacaoPorNivel} de população máxima por nível.
        </p>
      </section>
    );
  }

  const maximo = povoado.nivel >= P.vila.nivelMaximo;
  const custo = custoNivelVila(povoado.nivel + 1);
  const faltam = cidade ? recursosQueFaltam(cidade.recursos, custo) : custo;
  const falta = RECURSOS.filter((r) => faltam[r] > 0);
  return (
    <section className="space-y-1.5 rounded-lg border border-couro bg-noite/50 p-3 text-sm">
      <h3 className="font-semibold text-ouro">
        🏘️ Vila nível {povoado.nivel} de {P.vila.nivelMaximo}
      </h3>
      <p>+{P.vila.populacaoPorNivel * povoado.nivel} de população máxima na cidade do dono.</p>
      {lealdade}
      {meu && (
        <>
          <p className="text-xs text-pergaminho-escuro">Se outro jogador saquear a vila, ela volta ao nível 0.</p>
          {!maximo && (
            <>
              <button
                onClick={() => void melhorar()}
                disabled={!cidade || falta.length > 0 || enviando}
                className="mt-1 w-full rounded-lg border border-ouro/60 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:border-couro disabled:text-pergaminho-escuro"
              >
                {enviando
                  ? 'Melhorando…'
                  : `Melhorar para nível ${povoado.nivel + 1} · ${RECURSOS.filter((r) => custo[r] > 0)
                      .map((r) => `${formatarNumero(custo[r])} ${RECURSOS_INFO[r].icone}`)
                      .join(' · ')}`}
              </button>
              {cidade && falta.length > 0 && (
                <p className="text-xs text-red-300 tabular-nums">
                  Faltam {falta.map((r) => `${formatarNumero(faltam[r])} ${RECURSOS_INFO[r].icone}`).join(' · ')}
                </p>
              )}
            </>
          )}
          {erro && (
            <p role="alert" className="text-xs text-red-300">
              {erro}
            </p>
          )}
        </>
      )}
    </section>
  );
}
