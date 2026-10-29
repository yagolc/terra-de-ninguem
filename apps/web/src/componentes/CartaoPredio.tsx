import {
  BALANCEAMENTO,
  MENSAGENS_EVOLUCAO,
  RECURSOS,
  capacidadeArmazem,
  custoEvolucao,
  limitePopulacao,
  niveisProjetados,
  producaoHora,
  protecaoArmazem,
  recursosQueFaltam,
  tempoEvolucaoMs,
  vagasTrabalho,
  verificarEvolucao,
  type EstadoCidade,
  type Obra,
  type Recursos,
  type TipoPredio,
} from '@terra/regras';
import { PREDIOS, RECURSOS_INFO, formatarDuracao, formatarNumero, formatarTaxa } from '../lib/textos';

/** Uma linha curta com o efeito atual do prédio. */
function efeito(tipo: TipoPredio, cidade: EstadoCidade, bonus: Recursos): string | null {
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
      return `${cidade.trabalhadores[recurso]}/${vagas} trabalhadores · ${formatarTaxa(producaoHora(cidade, bonus)[recurso])} ${RECURSOS_INFO[recurso].nome.toLowerCase()}/h`;
    }
    case 'armazem':
      return `Guarda ${formatarNumero(capacidadeArmazem(nivel))} · protege ${formatarNumero(protecaoArmazem(nivel))} de cada`;
    case 'quartel':
      return nivel === 1
        ? 'Treina tropas no painel Exército'
        : `Treina ${Math.round(Math.min(BALANCEAMENTO.treino.reducaoMaxima, BALANCEAMENTO.treino.reducaoPorNivelQuartel * (nivel - 1)) * 100)}% mais rápido · painel Exército`;
    case 'muralha':
      return `+${Math.round(BALANCEAMENTO.batalha.bonusMuralhaPorNivel * nivel * 100)}% de defesa na cidade`;
  }
}

type Props = {
  tipo: TipoPredio;
  cidade: EstadoCidade;
  bonus: Recursos;
  /** Fila de obras da cidade, na ordem em que serão feitas. */
  obras: Obra[];
  agora: number;
  ocupado: boolean;
  onEvoluir: (tipo: TipoPredio) => void;
};

/** "140 de madeira e 70 de ouro" */
function descreverFalta(falta: Recursos): string {
  const partes = RECURSOS.filter((r) => falta[r] > 0).map((r) => `${formatarNumero(falta[r])} de ${RECURSOS_INFO[r].nome.toLowerCase()}`);
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : (partes[0] ?? '');
}

export default function CartaoPredio({ tipo, cidade, bonus, obras, agora, ocupado, onEvoluir }: Props) {
  const info = PREDIOS[tipo];
  const nivel = cidade.predios[tipo];
  // Níveis contando as obras da fila: o próximo pedido deste prédio vai para o nível seguinte a eles.
  const nivelProjetado = niveisProjetados(cidade.predios, obras)[tipo];
  const minhasObras = obras.flatMap((obra, posicao) => (obra.tipo === tipo ? [{ obra, posicao }] : []));
  const maximo = nivelProjetado >= BALANCEAMENTO.predios[tipo].nivelMaximo;
  const verificacao = verificarEvolucao({ predios: cidade.predios, tipo, recursos: cidade.recursos, obras, agora });
  const custo = custoEvolucao(tipo, nivelProjetado + 1);
  const textoEfeito = efeito(tipo, cidade, bonus);
  const naFila = obras.length > 0;

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-carvao/90 p-4 ${minhasObras.length > 0 ? 'border-ouro/70' : nivel === 0 ? 'border-couro/60 opacity-90' : 'border-couro'}`}
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

      <div className="mt-auto space-y-2">
        {minhasObras.map(({ obra, posicao }, i) => (
          <div
            key={obra.prontoEm}
            className={`rounded-lg border px-3 py-2 text-sm ${posicao === 0 ? 'border-ouro/40 bg-ouro/10 text-ouro-claro' : 'border-couro bg-noite/50 text-pergaminho-escuro'}`}
          >
            {posicao === 0 ? '🔨' : '⏳'} {nivel + i === 0 ? 'Construção' : `Nível ${nivel + i + 1}`}
            {posicao === 0 ? ' · faltam ' : ' · na fila, pronto em '}
            <span className="tabular-nums">{formatarDuracao(obra.prontoEm - agora)}</span>
          </div>
        ))}

        {maximo ? (
          <p className="text-sm text-pergaminho-escuro">Nível máximo</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs tabular-nums">
              {RECURSOS.filter((r) => custo[r] > 0).map((r) => (
                <span key={r} className={cidade.recursos[r] >= custo[r] ? 'text-pergaminho' : 'text-red-300'}>
                  {RECURSOS_INFO[r].icone} {formatarNumero(custo[r])}
                </span>
              ))}
              <span className="text-pergaminho-escuro">⏱ {formatarDuracao(tempoEvolucaoMs(tipo, nivelProjetado + 1))}</span>
            </div>
            <button
              onClick={() => onEvoluir(tipo)}
              disabled={!verificacao.ok || ocupado}
              className="w-full rounded-lg bg-ouro px-3 py-2 text-sm font-semibold text-noite transition hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
            >
              {naFila ? '⏳ Pôr na fila: ' : ''}
              {nivelProjetado === 0 ? 'Construir' : `${naFila ? 'nível' : 'Evoluir para nível'} ${nivelProjetado + 1}`}
            </button>
            {!verificacao.ok && (
              <p className={`text-xs ${verificacao.motivo === 'recursos_insuficientes' ? 'text-red-300' : 'text-pergaminho-escuro'}`}>
                {verificacao.motivo === 'recursos_insuficientes'
                  ? `Faltam ${descreverFalta(recursosQueFaltam(cidade.recursos, custo))}.`
                  : MENSAGENS_EVOLUCAO[verificacao.motivo]}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
