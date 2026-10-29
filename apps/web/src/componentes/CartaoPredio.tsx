import {
  BALANCEAMENTO,
  MENSAGENS_EVOLUCAO,
  RECURSOS,
  capacidadeArmazem,
  custoEvolucao,
  limitePopulacao,
  producaoHora,
  protecaoArmazem,
  tempoEvolucaoMs,
  vagasTrabalho,
  verificarEvolucao,
  type EstadoCidade,
  type Obra,
  type TipoPredio,
} from '@terra/regras';
import { PREDIOS, RECURSOS_INFO, formatarDuracao, formatarNumero, formatarTaxa } from '../lib/textos';

/** Uma linha curta com o efeito atual do prédio. */
function efeito(tipo: TipoPredio, cidade: EstadoCidade): string | null {
  const nivel = cidade.predios[tipo];
  if (nivel === 0) return null;
  switch (tipo) {
    case 'centro':
      return `Outros prédios até o nível ${nivel}`;
    case 'casa':
      return `Limite de população: ${limitePopulacao(nivel)}`;
    case 'fazenda':
    case 'serraria':
    case 'mercado': {
      const recurso = tipo === 'fazenda' ? 'comida' : tipo === 'serraria' ? 'madeira' : 'ouro';
      const vagas = vagasTrabalho(cidade.predios)[recurso];
      return `${cidade.trabalhadores[recurso]}/${vagas} trabalhadores · ${formatarTaxa(producaoHora(cidade)[recurso])} ${RECURSOS_INFO[recurso].nome.toLowerCase()}/h`;
    }
    case 'armazem':
      return `Guarda ${formatarNumero(capacidadeArmazem(nivel))} · protege ${formatarNumero(protecaoArmazem(nivel))} de cada`;
    case 'quartel':
      return 'Treino de tropas chega no próximo épico';
    case 'muralha':
      return `+${Math.round(BALANCEAMENTO.batalha.bonusMuralhaPorNivel * nivel * 100)}% de defesa na cidade`;
  }
}

type Props = {
  tipo: TipoPredio;
  cidade: EstadoCidade;
  obra: Obra | null;
  agora: number;
  ocupado: boolean;
  onEvoluir: (tipo: TipoPredio) => void;
};

export default function CartaoPredio({ tipo, cidade, obra, agora, ocupado, onEvoluir }: Props) {
  const info = PREDIOS[tipo];
  const nivel = cidade.predios[tipo];
  const emObra = obra?.tipo === tipo;
  const maximo = nivel >= BALANCEAMENTO.predios[tipo].nivelMaximo;
  const verificacao = verificarEvolucao({ predios: cidade.predios, tipo, recursos: cidade.recursos, construcaoEmAndamento: obra !== null });
  const custo = custoEvolucao(tipo, nivel + 1);
  const textoEfeito = efeito(tipo, cidade);

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-carvao/90 p-4 ${emObra ? 'border-ouro/70' : nivel === 0 ? 'border-couro/60 opacity-90' : 'border-couro'}`}
    >
      <header className="flex items-start gap-3">
        <span className="text-3xl leading-none" aria-hidden>
          {info.icone}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-titulo text-base text-ouro">{info.nome}</h3>
          <p className="text-xs text-pergaminho-escuro">{nivel === 0 ? 'Não construído' : `Nível ${nivel}`}</p>
        </div>
      </header>

      <p className="text-sm text-pergaminho-escuro">{info.descricao}</p>
      {textoEfeito && <p className="text-sm text-pergaminho">{textoEfeito}</p>}

      <div className="mt-auto">
        {emObra ? (
          <div className="rounded-lg border border-ouro/40 bg-ouro/10 px-3 py-2 text-sm text-ouro-claro">
            🔨 {nivel === 0 ? 'Construindo' : `Evoluindo para o nível ${nivel + 1}`} · faltam{' '}
            <span className="tabular-nums">{formatarDuracao(obra.prontoEm - agora)}</span>
          </div>
        ) : maximo ? (
          <p className="text-sm text-pergaminho-escuro">Nível máximo</p>
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
              {RECURSOS.filter((r) => custo[r] > 0).map((r) => (
                <span key={r} className={cidade.recursos[r] >= custo[r] ? 'text-pergaminho' : 'text-red-300'}>
                  {RECURSOS_INFO[r].icone} {formatarNumero(custo[r])}
                </span>
              ))}
              <span className="text-pergaminho-escuro">⏱ {formatarDuracao(tempoEvolucaoMs(tipo, nivel + 1))}</span>
            </div>
            <button
              onClick={() => onEvoluir(tipo)}
              disabled={!verificacao.ok || ocupado}
              className="w-full rounded-lg bg-ouro px-3 py-2 text-sm font-semibold text-noite transition hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
            >
              {nivel === 0 ? 'Construir' : `Evoluir para nível ${nivel + 1}`}
            </button>
            {!verificacao.ok && verificacao.motivo !== 'recursos_insuficientes' && (
              <p className="mt-1.5 text-xs text-pergaminho-escuro">{MENSAGENS_EVOLUCAO[verificacao.motivo]}</p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
