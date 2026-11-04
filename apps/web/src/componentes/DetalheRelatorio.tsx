import { BALANCEAMENTO, RECURSOS, TIPOS_UNIDADE, totalUnidades, type Exercito } from '@terra/regras';
import type { HeroiNoRelatorio, Relatorio } from '../lib/useRelatorios';
import { ESPECIALIDADES_INFO, RECURSOS_INFO, TERRENOS_INFO, UNIDADES_INFO, formatarNumero } from '../lib/textos';

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

function LinhaHeroi({ lado, heroi }: { lado: string; heroi: HeroiNoRelatorio }) {
  const info = ESPECIALIDADES_INFO[heroi.especialidade];
  return (
    <p className="text-xs">
      🎖️ {lado}: {heroi.nome} ({info.icone} {info.nome} nível {heroi.nivel}){heroi.ferido && <span className="text-red-300"> · ferido</span>}
    </p>
  );
}

/** Detalhe de uma batalha: exércitos, perdas, forças, modificadores, heróis e saque. */
export default function DetalheRelatorio({ relatorio, nomeDefensor }: { relatorio: Relatorio; nomeDefensor: string }) {
  const d = relatorio.dados;
  const saqueTotal = RECURSOS.reduce((s, r) => s + d.saque[r], 0);
  const bonus: string[] = [];
  if (d.terreno !== 'planicie') bonus.push(`${TERRENOS_INFO[d.terreno].icone} ${TERRENOS_INFO[d.terreno].efeito}`);
  if (d.muralha > 0) bonus.push(`🧱 muralha nível ${d.muralha}`);
  if (d.palicada) bonus.push('🪵 paliçada');
  if (d.povoado?.tipo === 'cidade_livre') bonus.push('⚖️ muralha da cidade livre');

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
      {d.heroiAtacante && <LinhaHeroi lado="Herói do atacante" heroi={d.heroiAtacante} />}
      {d.heroiDefensor && <LinhaHeroi lado={`Herói de ${nomeDefensor}`} heroi={d.heroiDefensor} />}

      {saqueTotal > 0 && (
        <p>
          💰 Saque:{' '}
          {RECURSOS.filter((r) => d.saque[r] > 0)
            .map((r) => `${RECURSOS_INFO[r].icone} ${formatarNumero(d.saque[r])}`)
            .join(' · ')}
          {d.povoado?.tipo === 'vila' && (d.vilaZerada ? ' · a vila foi saqueada e voltou ao nível 0' : ' · do estoque da vila')}
        </p>
      )}
      {d.vilaZerada && saqueTotal === 0 && <p>🏘️ A vila foi saqueada e voltou ao nível 0.</p>}
      {d.milicia && (
        <p>
          ⚖️ A cidade livre jurou lealdade: {BALANCEAMENTO.povoados.cidadeLivre.milicia} lanceiros de milícia passam a defendê-la para o
          conquistador, sem ocupar população.
        </p>
      )}
    </div>
  );
}
