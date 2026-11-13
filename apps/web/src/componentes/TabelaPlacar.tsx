import { BALANCEAMENTO } from '@terra/regras';
import { RACAS_INFO, TITULO_HERDEIRO } from '../lib/textos';
import Bandeira from './Bandeira';
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
                <a href={`#perfil=${linha.jogadorId}`} title={`Perfil de ${linha.nome}`} className="hover:text-ouro-claro hover:underline">
                  <Bandeira bandeira={linha.bandeira} largura={21} semEmblema className="mr-1.5 inline-block align-[-2px]" />
                  {linha.raca && <span title={RACAS_INFO[linha.raca].nome}>{RACAS_INFO[linha.raca].icone} </span>}
                  {linha.nome}
                </a>
                {linha.jogadorId === vencedorId && ' 👑'}
                {linha.usosGemas > 0 && (
                  <span className="ml-1 text-xs text-ouro-claro" title={`Terminou ${linha.usosGemas} ${linha.usosGemas === 1 ? 'obra' : 'obras'} com gemas nesta temporada`}>
                    ⚡{linha.usosGemas}
                  </span>
                )}
                {linha.titulo && <span className="block text-[11px] italic text-ouro-claro">{linha.titulo}</span>}
                {linha.herdeiro && (
                  <span className="block text-[11px] text-ouro-claro" title="Cada batalha vencida contra ele vale pontos a mais">
                    {TITULO_HERDEIRO} · 🎯 cabeça a prêmio
                  </span>
                )}
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
        {porTerritorio} por território · {porHabitante} por habitante · {porVitoria} por batalha vencida (+
        {BALANCEAMENTO.herdeiro.pontosPorVitoria} contra o herdeiro do trono). Atualizado a cada minuto.
      </p>
    </div>
  );
}
