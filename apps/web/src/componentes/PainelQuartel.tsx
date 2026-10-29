import {
  BALANCEAMENTO,
  MENSAGENS_TREINO,
  RECURSOS,
  TIPOS_UNIDADE,
  consumoComidaHora,
  custoTreino,
  habitantesLivres,
  totalUnidades,
  verificarTreino,
  type EstadoCidade,
  type Exercito,
  type LoteTreino,
  type TipoUnidade,
} from '@terra/regras';
import { useState } from 'react';
import { RECURSOS_INFO, UNIDADES_INFO, formatarDuracao, formatarNumero, formatarTaxa } from '../lib/textos';

type Props = {
  cidade: EstadoCidade;
  tropas: Exercito;
  fila: LoteTreino[];
  soldados: number;
  agora: number;
  ocupado: boolean;
  onTreinar: (tipo: TipoUnidade, quantidade: number) => void;
};

/** Quanto dá para treinar agora, limitado por recursos e habitantes livres. */
function maximoTreinavel(cidade: EstadoCidade, tipo: TipoUnidade, soldados: number): number {
  const custo = BALANCEAMENTO.unidades[tipo].custo;
  const porRecurso = RECURSOS.filter((r) => custo[r] > 0).map((r) => Math.floor(cidade.recursos[r] / custo[r]));
  return Math.max(0, Math.min(habitantesLivres(cidade, soldados), ...porRecurso));
}

/** Exército do jogador e treino de tropas no quartel. */
export default function PainelQuartel({ cidade, tropas, fila, soldados, agora, ocupado, onTreinar }: Props) {
  const [tipo, setTipo] = useState<TipoUnidade>('lanceiro');
  const [quantidade, setQuantidade] = useState(1);

  if (cidade.predios.quartel < 1) {
    return (
      <section className="rounded-xl border border-couro bg-carvao/90 p-4">
        <h2 className="font-titulo text-lg text-ouro">Exército</h2>
        <p className="mt-1 text-sm text-pergaminho-escuro">Construa o Quartel para treinar lanceiros, arqueiros e cavalaria.</p>
      </section>
    );
  }

  const maximo = maximoTreinavel(cidade, tipo, soldados);
  const verificacao = verificarTreino({ cidade, tipo, quantidade, soldados, fila, agora });
  const custo = custoTreino(tipo, quantidade);
  const atributos = BALANCEAMENTO.unidades[tipo];

  return (
    <section className="rounded-xl border border-couro bg-carvao/90 p-4">
      <h2 className="font-titulo text-lg text-ouro">Exército</h2>
      <ul className="mt-2 grid grid-cols-3 gap-2 text-center">
        {TIPOS_UNIDADE.map((t) => (
          <li key={t} className="rounded-lg bg-noite/60 px-2 py-1.5">
            <div className="text-lg" aria-hidden>
              {UNIDADES_INFO[t].icone}
            </div>
            <div className="font-semibold tabular-nums">{tropas[t]}</div>
            <div className="text-[11px] text-pergaminho-escuro">{UNIDADES_INFO[t].plural}</div>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-xs text-pergaminho-escuro">
        {totalUnidades(tropas) > 0
          ? `Comem ${formatarTaxa(consumoComidaHora(tropas))} de comida por hora.`
          : 'Nenhuma tropa ainda. Cada soldado ocupa 1 habitante e come comida.'}
      </p>

      <h3 className="mt-4 text-sm font-semibold">Treinar</h3>
      <div role="tablist" className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-noite/70 p-1">
        {TIPOS_UNIDADE.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={t === tipo}
            onClick={() => {
              setTipo(t);
              setQuantidade(1);
            }}
            className={`rounded-md px-1 py-1.5 text-xs font-medium ${t === tipo ? 'bg-couro text-ouro' : 'text-pergaminho-escuro hover:text-pergaminho'}`}
          >
            {UNIDADES_INFO[t].icone} {UNIDADES_INFO[t].nome}
          </button>
        ))}
      </div>

      <p className="mt-2 text-xs text-pergaminho-escuro">{UNIDADES_INFO[tipo].descricao}</p>
      <p className="mt-1 text-xs tabular-nums text-pergaminho-escuro">
        ⚔ {atributos.ataque} · 🛡 {atributos.defesa} · velocidade {atributos.velocidade} léguas/h · carrega {atributos.carga} ·
        come {atributos.consumoComidaHora}/h
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          aria-label="Menos"
          onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
          className="size-8 rounded-md border border-couro text-lg leading-none hover:border-ouro/60"
        >
          −
        </button>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={quantidade}
          onChange={(e) => setQuantidade(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="w-16 rounded-md border border-couro bg-noite/70 px-2 py-1 text-center tabular-nums focus:border-ouro focus:outline-none"
          aria-label="Quantidade"
        />
        <button
          aria-label="Mais"
          onClick={() => setQuantidade((q) => q + 1)}
          className="size-8 rounded-md border border-couro text-lg leading-none hover:border-ouro/60"
        >
          +
        </button>
        <button
          onClick={() => setQuantidade(Math.max(1, maximo))}
          disabled={maximo < 1}
          className="rounded-md border border-couro px-2 py-1 text-xs text-pergaminho-escuro hover:text-pergaminho disabled:opacity-40"
        >
          máx. {maximo}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
        {RECURSOS.filter((r) => custo[r] > 0).map((r) => (
          <span key={r} className={cidade.recursos[r] >= custo[r] ? '' : 'text-red-300'}>
            {RECURSOS_INFO[r].icone} {formatarNumero(custo[r])}
          </span>
        ))}
        {verificacao.ok && <span className="text-pergaminho-escuro">⏱ pronto em {formatarDuracao(verificacao.prontoEm - agora)}</span>}
      </div>

      <button
        onClick={() => onTreinar(tipo, quantidade)}
        disabled={!verificacao.ok || ocupado}
        className="mt-3 w-full rounded-lg bg-ouro px-3 py-2 text-sm font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
      >
        Treinar {quantidade} {quantidade === 1 ? UNIDADES_INFO[tipo].nome.toLowerCase() : UNIDADES_INFO[tipo].plural.toLowerCase()}
      </button>
      {!verificacao.ok && verificacao.motivo !== 'recursos_insuficientes' && (
        <p className="mt-1.5 text-xs text-red-300">{MENSAGENS_TREINO[verificacao.motivo]}</p>
      )}

      {fila.length > 0 && (
        <>
          <h3 className="mt-4 text-sm font-semibold">
            Fila do quartel{' '}
            <span className="font-normal text-pergaminho-escuro">
              ({fila.length}/{BALANCEAMENTO.treino.maxLotesNaFila})
            </span>
          </h3>
          <ol className="mt-1.5 space-y-1 text-sm">
            {fila.map((lote, i) => (
              <li key={`${lote.prontoEm}-${i}`} className="flex justify-between rounded-md bg-noite/60 px-2.5 py-1.5">
                <span>
                  {UNIDADES_INFO[lote.tipo].icone} {lote.quantidade} {UNIDADES_INFO[lote.tipo].plural.toLowerCase()}
                </span>
                <span className="tabular-nums text-pergaminho-escuro">{formatarDuracao(lote.prontoEm - agora)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
