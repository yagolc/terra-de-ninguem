import {
  RECURSOS,
  capacidadeArmazem,
  consumoComidaHora,
  habitantesLivres,
  limitePopulacao,
  producaoHora,
  type EstadoCidade,
  type Exercito,
  type Recursos,
} from '@terra/regras';
import { RECURSOS_INFO, formatarNumero, formatarTaxa } from '../lib/textos';

type Props = {
  cidade: EstadoCidade;
  bonus: Recursos;
  /** Todas as tropas do jogador: comem comida continuamente. */
  tropas: Exercito;
  /** Tropas mais as que estão em treino (ocupam população). */
  soldados: number;
};

/** Estoque de cada recurso (subindo em tempo real), saldo por hora e população. */
export default function BarraRecursos({ cidade, bonus, tropas, soldados }: Props) {
  const teto = capacidadeArmazem(cidade.predios.armazem);
  const producao = producaoHora(cidade, bonus);
  const saldo: Recursos = { ...producao, comida: producao.comida - consumoComidaHora(tropas) };
  const limite = limitePopulacao(cidade.predios.casa);
  const livres = habitantesLivres(cidade, soldados);
  const fome = saldo.comida < 0 && cidade.recursos.comida < 1;

  return (
    <div className="grid grid-cols-4 gap-2">
      {RECURSOS.map((r) => {
        const cheio = cidade.recursos[r] >= teto;
        const negativo = saldo[r] < 0;
        return (
          <div key={r} className="rounded-xl border border-couro bg-carvao/90 px-2.5 py-2 text-center sm:px-3">
            <div className="text-xs text-pergaminho-escuro">
              <span aria-hidden>{RECURSOS_INFO[r].icone}</span> {RECURSOS_INFO[r].nome}
            </div>
            <div className={`font-semibold tabular-nums ${cheio ? 'text-ouro' : negativo && r === 'comida' && fome ? 'text-red-300' : 'text-pergaminho'}`}>
              {formatarNumero(cidade.recursos[r])}
            </div>
            <div className={`text-[11px] tabular-nums ${negativo ? 'text-red-300' : 'text-pergaminho-escuro/80'}`}>
              {cheio && !negativo ? 'armazém cheio' : `${negativo ? '' : '+'}${formatarTaxa(saldo[r])}/h`}
            </div>
          </div>
        );
      })}
      <div className="rounded-xl border border-couro bg-carvao/90 px-2.5 py-2 text-center sm:px-3">
        <div className="text-xs text-pergaminho-escuro">
          <span aria-hidden>👥</span> Povo
        </div>
        <div className="font-semibold tabular-nums">
          {formatarNumero(cidade.populacao)}
          <span className="text-xs font-normal text-pergaminho-escuro">/{limite}</span>
        </div>
        <div className="text-[11px] text-pergaminho-escuro/80 tabular-nums">{livres} livres</div>
      </div>
      <p className={`col-span-4 text-center text-[11px] ${fome ? 'text-red-300' : 'text-pergaminho-escuro/70'}`}>
        {fome
          ? '⚠️ A comida acabou: suas tropas estão desertando. Ponha mais gente na fazenda ou treine menos.'
          : saldo.comida < 0
            ? `⚠️ As tropas comem mais do que a fazenda produz: a comida acaba em ${formatarTaxa(cidade.recursos.comida / -saldo.comida)} h.`
            : `Armazém guarda até ${formatarNumero(teto)} de cada recurso${RECURSOS.every((r) => producao[r] === 0) ? ' · coloque trabalhadores para produzir' : ''}`}
      </p>
    </div>
  );
}
