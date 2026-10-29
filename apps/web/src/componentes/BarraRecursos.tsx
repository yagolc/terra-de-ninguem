import { RECURSOS, capacidadeArmazem, habitantesLivres, limitePopulacao, producaoHora, type EstadoCidade } from '@terra/regras';
import { RECURSOS_INFO, formatarNumero, formatarTaxa } from '../lib/textos';

/** Estoque de cada recurso (subindo em tempo real), produção por hora e população. */
export default function BarraRecursos({ cidade }: { cidade: EstadoCidade }) {
  const teto = capacidadeArmazem(cidade.predios.armazem);
  const producao = producaoHora(cidade);
  const limite = limitePopulacao(cidade.predios.casa);
  const livres = habitantesLivres(cidade, 0);

  return (
    <div className="grid grid-cols-4 gap-2">
      {RECURSOS.map((r) => {
        const cheio = cidade.recursos[r] >= teto;
        return (
          <div key={r} className="rounded-xl border border-couro bg-carvao/90 px-2.5 py-2 text-center sm:px-3">
            <div className="text-xs text-pergaminho-escuro">
              <span aria-hidden>{RECURSOS_INFO[r].icone}</span> {RECURSOS_INFO[r].nome}
            </div>
            <div className={`font-semibold tabular-nums ${cheio ? 'text-ouro' : 'text-pergaminho'}`}>
              {formatarNumero(cidade.recursos[r])}
            </div>
            <div className="text-[11px] text-pergaminho-escuro/80 tabular-nums">
              {cheio ? 'armazém cheio' : `+${formatarTaxa(producao[r])}/h`}
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
      <p className="col-span-4 text-center text-[11px] text-pergaminho-escuro/70">
        Armazém guarda até {formatarNumero(teto)} de cada recurso
        {RECURSOS.every((r) => producao[r] === 0) && ' · coloque trabalhadores para produzir'}
      </p>
    </div>
  );
}
