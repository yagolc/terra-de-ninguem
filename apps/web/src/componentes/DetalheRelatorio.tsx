import { RECURSOS, TIPOS_UNIDADE, totalUnidades, type Exercito } from '@terra/regras';
import type { Relatorio } from '../lib/useRelatorios';
import { RECURSOS_INFO, TERRENOS_INFO, UNIDADES_INFO, formatarNumero } from '../lib/textos';

function LinhaExercito({ rotulo, exercito, perdas }: { rotulo: string; exercito: Exercito; perdas: Exercito }) {
  return (
    <tr className="border-t border-couro/60">
      <th className="py-1.5 pr-2 text-left font-normal text-pergaminho-escuro">{rotulo}</th>
      {TIPOS_UNIDADE.map((t) => (
        <td key={t} className="px-1 py-1.5 text-center tabular-nums">
          {exercito[t]}
          {perdas[t] > 0 && <span className="block text-xs text-red-300">−{perdas[t]}</span>}
        </td>
      ))}
    </tr>
  );
}

/** Detalhe de uma batalha: exércitos, perdas, forças, modificadores e saque. */
export default function DetalheRelatorio({ relatorio, nomeDefensor }: { relatorio: Relatorio; nomeDefensor: string }) {
  const d = relatorio.dados;
  const saqueTotal = RECURSOS.reduce((s, r) => s + d.saque[r], 0);
  const bonus: string[] = [];
  if (d.terreno !== 'planicie') bonus.push(`${TERRENOS_INFO[d.terreno].icone} ${TERRENOS_INFO[d.terreno].efeito}`);
  if (d.muralha > 0) bonus.push(`🧱 muralha nível ${d.muralha}`);

  return (
    <div className="space-y-3 text-sm">
      <table className="w-full">
        <thead>
          <tr className="text-xs text-pergaminho-escuro">
            <th />
            {TIPOS_UNIDADE.map((t) => (
              <th key={t} className="px-1 font-normal">
                {UNIDADES_INFO[t].icone}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <LinhaExercito rotulo="Atacante" exercito={d.atacante} perdas={d.perdasAtacante} />
          <LinhaExercito rotulo={nomeDefensor} exercito={d.defensor} perdas={d.perdasDefensor} />
        </tbody>
      </table>

      <p className="text-pergaminho-escuro">
        Força de ataque <span className="text-pergaminho">{formatarNumero(d.forcaAtaque)}</span> contra defesa{' '}
        <span className="text-pergaminho">{formatarNumero(d.forcaDefesa)}</span>
        {d.margem !== null && ` (${d.margem.toFixed(2).replace('.', ',')}×)`}
        {totalUnidades(d.defensor) === 0 && ' · ninguém defendia'}
        {bonus.length > 0 && ` · defesa com ${bonus.join(', ')}`}.
      </p>

      {saqueTotal > 0 && (
        <p>
          💰 Saque:{' '}
          {RECURSOS.filter((r) => d.saque[r] > 0)
            .map((r) => `${RECURSOS_INFO[r].icone} ${formatarNumero(d.saque[r])}`)
            .join(' · ')}
        </p>
      )}
    </div>
  );
}
