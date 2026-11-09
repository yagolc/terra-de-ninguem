import { RECURSOS, TIPOS_MISSAO, missaoCumprida, recompensaMissao, type SituacaoMissoes, type TipoMissao } from '@terra/regras';
import { MISSOES_INFO, RECURSOS_INFO, formatarNumero } from '../lib/textos';

type Props = {
  resgatadas: readonly string[];
  situacao: SituacaoMissoes;
  ocupado: boolean;
  onResgatar: (missao: TipoMissao) => void;
};

/** "Primeiros passos": as missões de início com a recompensa de cada uma. Some quando todas foram resgatadas. */
export default function PainelMissoes({ resgatadas, situacao, ocupado, onResgatar }: Props) {
  const pendentes = TIPOS_MISSAO.filter((m) => !resgatadas.includes(m));
  if (pendentes.length === 0) return null;
  const prontas = pendentes.filter((m) => missaoCumprida(m, situacao)).length;

  return (
    <section className="mb-4 rounded-xl border border-ouro/40 bg-carvao/90 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-titulo text-lg text-ouro">Primeiros passos</h2>
        <p className="text-xs text-pergaminho-escuro tabular-nums">
          {TIPOS_MISSAO.length - pendentes.length}/{TIPOS_MISSAO.length}
          {prontas > 0 && <span className="text-ouro-claro"> · {prontas} para pegar</span>}
        </p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {pendentes.map((m) => {
          const feita = missaoCumprida(m, situacao);
          const recompensa = recompensaMissao(m);
          return (
            <li key={m} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${feita ? 'bg-ouro/10' : 'bg-noite/50'}`}>
              <span aria-hidden>{feita ? '✅' : '⬜'}</span>
              <span className="min-w-0 flex-1">
                <span className="font-medium">{MISSOES_INFO[m].titulo}</span>
                <span className="block text-xs text-pergaminho-escuro">
                  {MISSOES_INFO[m].dica} Prêmio:{' '}
                  {RECURSOS.filter((r) => recompensa[r] > 0)
                    .map((r) => `${formatarNumero(recompensa[r])} ${RECURSOS_INFO[r].icone}`)
                    .join(' · ')}
                </span>
              </span>
              {feita && (
                <button
                  onClick={() => onResgatar(m)}
                  disabled={ocupado}
                  className="shrink-0 rounded-lg bg-ouro px-3 py-1.5 text-xs font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
                >
                  Pegar
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
