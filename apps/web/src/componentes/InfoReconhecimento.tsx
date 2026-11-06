import {
  BALANCEAMENTO,
  TIPOS_UNIDADE,
  analisarDefesa,
  bonusDefesaRaca,
  bonusHeroi,
  totalUnidades,
  type Raca,
  type TipoUnidade,
} from '@terra/regras';
import type { Reconhecimento } from '../lib/useMapa';
import { ESPECIALIDADES_INFO, ESTRUTURAS_INFO, RACAS_INFO, TERRENOS_INFO, UNIDADES_INFO, formatarDuracao } from '../lib/textos';

type Props = {
  reconhecimento: Reconhecimento;
  agora: number;
  nomeDono: string;
  /** O território tem cidade livre (muralha própria, +defesa para qualquer defensor). */
  cidadeLivre?: boolean;
  /** Raça do dono do território (elfo na floresta e anão na montanha defendem mais; orc defende menos). */
  racaDono?: Raca;
};

/** Alternativas de ataque, só de um tipo cada: "10 🐎 · ou 13 🏹 · ou 18 🔱". */
function Opcoes({ quantidades, ordem, melhor }: { quantidades: Record<TipoUnidade, number>; ordem: TipoUnidade[]; melhor: TipoUnidade | null }) {
  return (
    <span className="tabular-nums">
      {ordem.map((t, i) => (
        <span key={t}>
          {i > 0 && <span className="text-pergaminho-escuro"> · ou </span>}
          <span className={t === melhor ? 'font-semibold text-ouro' : ''}>
            {quantidades[t]} {UNIDADES_INFO[t].icone}
          </span>
        </span>
      ))}
    </span>
  );
}

/** O que o batedor viu: tropas, terreno, muralha, estrutura e quanto mandar para conquistar com folga. */
export default function InfoReconhecimento({ reconhecimento, agora, nomeDono, cidadeLivre = false, racaDono }: Props) {
  const { tropas, terreno, muralha, estrutura, estruturaPronta } = reconhecimento;
  const palicada = estrutura === 'palicada' && estruturaPronta;
  const heroi = reconhecimento.heroi;
  // Castelão visto pelo batedor: conta como se estivesse livre (pode estar ferido, mas é melhor sobrar tropa).
  const bonusDefesa = heroi?.especialidade === 'castelao' ? bonusHeroi(heroi.nivel) : 0;
  const defesaRaca = bonusDefesaRaca(racaDono, terreno);
  const analise = analisarDefesa({ defensor: tropas, terreno, nivelMuralha: muralha, palicada, cidadeLivre, bonusDefesa: bonusDefesa + defesaRaca });
  // Da melhor opção para a pior.
  const ordem = [...TIPOS_UNIDADE].sort((a, b) => analise.necessariosParaConquistar[a] - analise.necessariosParaConquistar[b]);
  const efeitos: string[] = [];
  if (terreno === 'floresta') efeitos.push(`🌲 floresta: arqueiros defendem +${Math.round(BALANCEAMENTO.batalha.bonusFlorestaArqueiro * 100)}%`);
  if (terreno === 'montanha') efeitos.push(`⛰️ montanha: defesa +${Math.round(BALANCEAMENTO.batalha.bonusMontanha * 100)}%`);
  if (muralha > 0) efeitos.push(`🧱 muralha nível ${muralha}: defesa +${Math.round(BALANCEAMENTO.batalha.bonusMuralhaPorNivel * muralha * 100)}%`);
  if (palicada) efeitos.push(`🪵 paliçada: defesa +${Math.round(BALANCEAMENTO.bonusPalicada * 100)}%`);
  if (racaDono && defesaRaca !== 0) {
    efeitos.push(`${RACAS_INFO[racaDono].icone} ${RACAS_INFO[racaDono].nome.toLowerCase()}: defesa ${defesaRaca > 0 ? '+' : '−'}${Math.round(Math.abs(defesaRaca) * 100)}%`);
  }
  if (bonusDefesa > 0) efeitos.push(`🛡️ herói castelão: defesa +${Math.round(bonusDefesa * 100)}%`);
  if (cidadeLivre) efeitos.push(`⚖️ cidade livre: defesa +${Math.round(BALANCEAMENTO.povoados.cidadeLivre.bonusDefesa * 100)}%`);
  const idade = agora - reconhecimento.observadoEm;

  return (
    <div className="space-y-2 rounded-lg border border-[#c39bd3]/50 bg-noite/60 px-3 py-2.5 text-sm">
      <p className="text-xs text-pergaminho-escuro">
        🔭 Batedor viu há {formatarDuracao(idade)}
        {idade > 3 * 3_600_000 && ' (pode ter mudado)'}
      </p>
      <p>
        <span className="text-pergaminho-escuro">{nomeDono}: </span>
        {totalUnidades(tropas) === 0
          ? 'ninguém defendendo!'
          : TIPOS_UNIDADE.filter((t) => tropas[t] > 0)
              .map((t) => `${UNIDADES_INFO[t].icone} ${tropas[t]} ${UNIDADES_INFO[t].plural.toLowerCase()}`)
              .join(' · ')}
      </p>
      <p className="text-xs text-pergaminho-escuro">
        {TERRENOS_INFO[terreno].icone} {TERRENOS_INFO[terreno].nome}
        {efeitos.length > 0 ? ` · ${efeitos.join(' · ')}` : ': sem bônus de defesa'}
      </p>
      <p className="text-xs text-pergaminho-escuro">
        {estrutura
          ? `${ESTRUTURAS_INFO[estrutura].icone} Estrutura: ${ESTRUTURAS_INFO[estrutura].nome}${estruturaPronta ? '' : ' (em construção quando o batedor passou)'}`
          : '🏗️ Nenhuma estrutura'}
      </p>
      {heroi && (
        <p className="text-xs">
          🎖️ Herói: {heroi.nome} ({ESPECIALIDADES_INFO[heroi.especialidade].icone} {ESPECIALIDADES_INFO[heroi.especialidade].nome} nível{' '}
          {heroi.nivel})
        </p>
      )}
      {totalUnidades(tropas) > 0 && (
        <div className="space-y-0.5 text-xs">
          <p className="text-pergaminho-escuro">Mande uma destas opções (só de um tipo), contando o azar máximo:</p>
          <p>
            <span className="text-pergaminho-escuro">🚩 Conquistar: </span>
            <Opcoes quantidades={analise.necessariosParaConquistar} ordem={ordem} melhor={analise.melhorTipo} />
          </p>
          <p>
            <span className="text-pergaminho-escuro">💰 Só vencer e saquear: </span>
            <Opcoes quantidades={analise.necessariosParaVencer} ordem={ordem} melhor={analise.melhorTipo} />
          </p>
          {analise.melhorTipo && (
            <p className="text-pergaminho-escuro">
              Em dourado, a melhor: {UNIDADES_INFO[analise.melhorTipo].plural.toLowerCase()} têm vantagem contra essa defesa.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
