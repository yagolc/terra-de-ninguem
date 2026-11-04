import { BALANCEAMENTO, TIPOS_UNIDADE, analisarDefesa, totalUnidades } from '@terra/regras';
import type { Reconhecimento } from '../lib/useMapa';
import { ESTRUTURAS_INFO, TERRENOS_INFO, UNIDADES_INFO, formatarDuracao } from '../lib/textos';

type Props = {
  reconhecimento: Reconhecimento;
  agora: number;
  nomeDono: string;
  /** O território tem cidade livre (muralha própria, +defesa para qualquer defensor). */
  cidadeLivre?: boolean;
};

/** O que o batedor viu: tropas, terreno, muralha, estrutura e quanto mandar para conquistar com folga. */
export default function InfoReconhecimento({ reconhecimento, agora, nomeDono, cidadeLivre = false }: Props) {
  const { tropas, terreno, muralha, estrutura, estruturaPronta } = reconhecimento;
  const palicada = estrutura === 'palicada' && estruturaPronta;
  const analise = analisarDefesa({ defensor: tropas, terreno, nivelMuralha: muralha, palicada, cidadeLivre });
  const efeitos: string[] = [];
  if (terreno === 'floresta') efeitos.push(`🌲 floresta: arqueiros defendem +${Math.round(BALANCEAMENTO.batalha.bonusFlorestaArqueiro * 100)}%`);
  if (terreno === 'montanha') efeitos.push(`⛰️ montanha: defesa +${Math.round(BALANCEAMENTO.batalha.bonusMontanha * 100)}%`);
  if (muralha > 0) efeitos.push(`🧱 muralha nível ${muralha}: defesa +${Math.round(BALANCEAMENTO.batalha.bonusMuralhaPorNivel * muralha * 100)}%`);
  if (palicada) efeitos.push(`🪵 paliçada: defesa +${Math.round(BALANCEAMENTO.bonusPalicada * 100)}%`);
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
      {totalUnidades(tropas) > 0 && (
        <p className="text-xs">
          <span className="text-pergaminho-escuro">Para conquistar com folga (mesmo com azar), mande cerca de: </span>
          {TIPOS_UNIDADE.map((t) => (
            <span key={t} className={t === analise.melhorTipo ? 'font-semibold text-ouro' : ''}>
              {' '}
              {UNIDADES_INFO[t].icone} {analise.necessariosParaConquistar[t]}
            </span>
          ))}
          {analise.melhorTipo && (
            <span className="block text-pergaminho-escuro">
              Melhor escolha: {UNIDADES_INFO[analise.melhorTipo].plural.toLowerCase()} (vantagem contra essa defesa).
            </span>
          )}
        </p>
      )}
    </div>
  );
}
