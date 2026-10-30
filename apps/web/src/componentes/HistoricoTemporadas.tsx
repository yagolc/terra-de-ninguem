import type { DadosTemporada } from '../lib/useTemporada';

const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Ranking histórico: o vencedor de cada temporada encerrada. */
export default function HistoricoTemporadas({ historico }: { historico: DadosTemporada['historico'] }) {
  const comVencedor = historico.filter((h) => h.vencedor);
  if (comVencedor.length === 0) return <p className="text-sm text-pergaminho-escuro">Nenhuma temporada terminou ainda.</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {comVencedor.map((h) => (
        <li key={h.numero} className="flex justify-between gap-3">
          <span>
            Temporada {h.numero}: <span className="text-ouro">👑 {h.vencedor}</span>
          </span>
          <span className="text-xs text-pergaminho-escuro">
            {h.motivoFim === 'objetivo' ? 'cumpriu o objetivo' : 'por pontos'}
            {h.encerradaEm && ` · ${data.format(new Date(h.encerradaEm))}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
