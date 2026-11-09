import { bonusHeroi, heroiDisponivel, heroiEmTreino, type Heroi } from '@terra/regras';
import { imagemDoHeroi } from '../lib/arte';
import { ESPECIALIDADES_INFO, formatarDuracao } from '../lib/textos';
import Ilustracao from './Ilustracao';

type Props = {
  heroi: Heroi | null;
  origemId: string;
  agora: number;
  marcado: boolean;
  onMudar: (levar: boolean) => void;
};

/** Caixa "Levar o herói" dos painéis de ataque e de movimento; só aparece se ele está no território de origem. */
export default function OpcaoHeroi({ heroi, origemId, agora, marcado, onMudar }: Props) {
  if (!heroi || heroi.territorioId !== origemId) return null;
  const info = ESPECIALIDADES_INFO[heroi.especialidade];
  const retrato = imagemDoHeroi(heroi.especialidade);
  if (!heroiDisponivel(heroi, agora)) {
    const ate = heroiEmTreino(heroi, agora) ? heroi.treinoProntoEm! : heroi.feridoAte!;
    return (
      <p className="rounded-lg bg-noite/60 px-3 py-2 text-xs text-pergaminho-escuro">
        🎖️ {heroi.nome} está aqui, mas {heroiEmTreino(heroi, agora) ? 'treinando' : 'ferido'} por mais {formatarDuracao(ate - agora)}.
      </p>
    );
  }
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-ouro/40 bg-ouro/5 px-3 py-2 text-sm">
      <input type="checkbox" checked={marcado} onChange={(e) => onMudar(e.target.checked)} className="mt-0.5 accent-[#d4a64a]" />
      {retrato && <Ilustracao src={retrato} className="size-12 shrink-0" />}
      <span>
        🎖️ Levar {heroi.nome}
        <span className="block text-xs text-pergaminho-escuro">
          {info.icone} {info.nome} nível {heroi.nivel}: +{Math.round(bonusHeroi(heroi.nivel, heroi.especialidade) * 100)}%. {info.descricao} Se a batalha for
          perdida, ele volta ferido para a cidade.
        </span>
      </span>
    </label>
  );
}
