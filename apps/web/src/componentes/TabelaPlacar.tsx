import { BALANCEAMENTO } from '@terra/regras';
import type { LinhaPlacar } from '../lib/useTemporada';

/** Ranking da temporada: pontos = territórios, habitantes e batalhas vencidas. */
export default function TabelaPlacar({ placar, meuId, vencedorId }: { placar: LinhaPlacar[]; meuId: string; vencedorId?: string | null }) {
  const { porTerritorio, porHabitante, porVitoria } = BALANCEAMENTO.pontos;
  if (placar.length === 0) return <p className="text-sm text-pergaminho-escuro">O placar aparece em até um minuto.</p>;

  return (
    <div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-pergaminho-escuro">
            <th className="py-1 text-left font-normal">#</th>
            <th className="py-1 text-left font-normal">Jogador</th>
            <th className="px-1 py-1 font-normal" title="Territórios">🏴</th>
            <th className="px-1 py-1 font-normal" title="Habitantes">👥</th>
            <th className="px-1 py-1 font-normal" title="Batalhas vencidas">⚔️</th>
            <th className="py-1 text-right font-normal">Pontos</th>
          </tr>
        </thead>
        <tbody>
          {placar.map((linha, i) => (
            <tr key={linha.jogadorId} className={`border-t border-couro/60 ${linha.jogadorId === meuId ? 'text-ouro-claro' : ''}`}>
              <td className="py-2 tabular-nums">{i + 1}</td>
              <td className="py-2">
                <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{ background: linha.cor ?? '#6b5a48' }} />
                {linha.nome}
                {linha.jogadorId === vencedorId && ' 👑'}
              </td>
              <td className="px-1 py-2 text-center tabular-nums">{linha.territorios}</td>
              <td className="px-1 py-2 text-center tabular-nums">{linha.populacao}</td>
              <td className="px-1 py-2 text-center tabular-nums">{linha.vitorias}</td>
              <td className="py-2 text-right font-semibold tabular-nums">{linha.pontos}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-pergaminho-escuro/80">
        {porTerritorio} por território · {porHabitante} por habitante · {porVitoria} por batalha vencida. Atualizado a cada minuto.
      </p>
    </div>
  );
}
