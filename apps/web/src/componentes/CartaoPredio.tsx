import {
  BALANCEAMENTO,
  MENSAGENS_EVOLUCAO,
  RECURSOS,
  cancelarObra,
  capacidadeArmazem,
  custoEvolucao,
  limitePopulacao,
  nivelArmazemNecessario,
  niveisProjetados,
  obraAceleravel,
  precoTerminarObra,
  pombosDoPombal,
  producaoHora,
  protecaoArmazem,
  recursosQueFaltam,
  tempoEvolucaoMs,
  vagasTrabalho,
  velocidadePombo,
  verificarEvolucao,
  type EstadoCidade,
  type Obra,
  type Recursos,
  type TipoPredio,
} from '@terra/regras';
import { useState } from 'react';
import { imagemDoPredio } from '../lib/arte';
import { PREDIOS, RECURSOS_INFO, formatarDuracao, formatarNumero, formatarTaxa, listarRecursos } from '../lib/textos';
import JanelaConfirmacao from './JanelaConfirmacao';

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
    case 'pombal':
      return `${pombosDoPombal(nivel)} pombos · voam ${Math.round(velocidadePombo(nivel))} léguas/h · aba Cartas`;
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
  /** Cancela a obra que termina em `prontoEm` (depois da confirmação). */
  onCancelar: (prontoEm: number) => void;
  /** Saldo de gemas e usos na temporada (null enquanto carrega): mostra o ⚡ na obra que está sendo feita. */
  gemas: { saldo: number; usos: number } | null;
  /** Termina com gemas a obra que termina em `prontoEm` (depois da confirmação). */
  onTerminar: (prontoEm: number) => void;
};

/** "140 de madeira e 70 de ouro" */
function descreverFalta(falta: Recursos): string {
  const partes = RECURSOS.filter((r) => falta[r] > 0).map((r) => `${formatarNumero(falta[r])} de ${RECURSOS_INFO[r].nome.toLowerCase()}`);
  return partes.length > 1 ? `${partes.slice(0, -1).join(', ')} e ${partes.at(-1)}` : (partes[0] ?? '');
}

export default function CartaoPredio({ tipo, cidade, bonus, obras, agora, ocupado, onEvoluir, onCancelar, gemas, onTerminar }: Props) {
  // Posição na fila da obra que o jogador quer cancelar (abre a confirmação).
  const [aCancelar, setACancelar] = useState<number | null>(null);
  // Confirmação de terminar com gemas a obra que está sendo feita.
  const [aTerminar, setATerminar] = useState(false);
  const precoAgora = gemas ? precoTerminarObra(gemas.usos) : 0;
  const temGemas = !!gemas && gemas.saldo >= precoAgora;
  const info = PREDIOS[tipo];
  const nivel = cidade.predios[tipo];
  // Níveis contando as obras da fila: o próximo pedido deste prédio vai para o nível seguinte a eles.
  const projetados = niveisProjetados(cidade.predios, obras);
  const nivelProjetado = projetados[tipo];
  const minhasObras = obras.flatMap((obra, posicao) => (obra.tipo === tipo ? [{ obra, posicao }] : []));
  const maximo = nivelProjetado >= BALANCEAMENTO.predios[tipo].nivelMaximo;
  const verificacao = verificarEvolucao({ predios: cidade.predios, tipo, recursos: cidade.recursos, obras, agora });
  const custo = custoEvolucao(tipo, nivelProjetado + 1);
  // Custo maior que o armazém (contando os da fila): avisa o nível necessário em vez de esperar à toa.
  const maiorCusto = Math.max(...RECURSOS.map((r) => custo[r]));
  const armazemNecessario =
    maiorCusto > capacidadeArmazem(projetados.armazem) ? nivelArmazemNecessario(maiorCusto) : null;
  const textoEfeito = efeito(tipo, cidade, bonus);
  const naFila = obras.length > 0;
  // Imagem da fase do nível atual; ainda não construído, a primeira fase apagada.
  const imagem = imagemDoPredio(tipo, nivel);
  const previa = aCancelar === null ? null : cancelarObra({ predios: cidade.predios, obras, indice: aCancelar, agora });

  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-carvao/90 p-4 ${minhasObras.length > 0 ? 'border-ouro/70' : nivel === 0 ? 'border-couro/60 opacity-90' : 'border-couro'}`}
    >
      {imagem && (
        <img
          src={imagem}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className={`mx-auto -my-1 aspect-square w-full max-w-40 object-contain [mask-image:radial-gradient(closest-side,black_85%,transparent)] ${nivel === 0 ? 'opacity-40 grayscale' : ''}`}
        />
      )}
      <header className="flex items-start gap-3">
        {!imagem && (
          <span className="text-3xl leading-none" aria-hidden>
            {info.icone}
          </span>
        )}
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
            <div className="flex items-center gap-2">
              <span className="flex-1">
                {posicao === 0 ? '🔨' : '⏳'} {nivel + i === 0 ? 'Construção' : `Nível ${nivel + i + 1}`}
                {posicao === 0 ? ' · faltam ' : ' · na fila, pronto em '}
                <span className="tabular-nums">{formatarDuracao(obra.prontoEm - agora)}</span>
              </span>
              {posicao === 0 && gemas && obraAceleravel(tipo, nivel + 1) && (
                <button
                  onClick={() => setATerminar(true)}
                  disabled={ocupado}
                  aria-label={`Terminar agora com gemas: ${info.nome}`}
                  title={`Terminar agora: ${precoAgora} gemas`}
                  className="-my-1 shrink-0 rounded-md border border-ouro/50 px-1.5 py-0.5 text-xs text-ouro-claro hover:bg-ouro/20 disabled:opacity-40"
                >
                  ⚡ {precoAgora}💎
                </button>
              )}
              <button
                onClick={() => setACancelar(posicao)}
                disabled={ocupado}
                aria-label={`Cancelar ${nivel + i === 0 ? 'construção' : `nível ${nivel + i + 1}`} de ${info.nome}`}
                title="Cancelar"
                className="-my-1 shrink-0 rounded-md px-1.5 py-0.5 text-pergaminho-escuro hover:bg-sangue/40 hover:text-pergaminho disabled:opacity-40"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
        {aTerminar && gemas && obras[0] && (
          <JanelaConfirmacao
            titulo="Terminar agora?"
            confirmar={temGemas ? `Terminar por ${precoAgora} 💎` : 'Ir para a loja'}
            onConfirmar={() => {
              if (temGemas) onTerminar(obras[0]!.prontoEm);
              else location.hash = 'perfil';
            }}
            onFechar={() => setATerminar(false)}
          >
            <p>
              {info.nome} {nivel === 0 ? '(construção)' : `nível ${nivel + 1}`} fica pronto na hora, em vez de daqui a{' '}
              <span className="tabular-nums">{formatarDuracao(obras[0].prontoEm - agora)}</span>. As obras de depois andam para a frente.
            </p>
            <p>
              Custa <b>{precoAgora} gemas</b> (você tem {gemas.saldo}). O próximo uso nesta temporada vai custar{' '}
              {precoTerminarObra(gemas.usos + 1)}.
            </p>
            {!temGemas && <p className="text-red-300">Gemas insuficientes. Compre mais na loja, no seu perfil.</p>}
            <p className="text-xs text-pergaminho-escuro">Todos veem no placar quantas vezes você usou (⚡).</p>
          </JanelaConfirmacao>
        )}
        {previa?.ok && (
          <JanelaConfirmacao
            titulo="Cancelar obra?"
            confirmar="Cancelar obra"
            onConfirmar={() => onCancelar(obras[aCancelar!]!.prontoEm)}
            onFechar={() => setACancelar(null)}
          >
            <p>
              Sai da fila:{' '}
              {previa.canceladas
                .map((c) => `${PREDIOS[c.tipo].nome} ${c.nivelAlvo === 1 ? '(construção)' : `nível ${c.nivelAlvo}`}`)
                .join(', ')}
              .
            </p>
            {previa.canceladas.length > 1 && (
              <p className="text-xs text-pergaminho-escuro">As de depois dependiam dessa e saem junto.</p>
            )}
            <p>
              Volta tudo o que foi pago: <span className="tabular-nums">{listarRecursos(previa.devolver)}</span>.
            </p>
          </JanelaConfirmacao>
        )}

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
            {armazemNecessario !== null && (
              <p className="text-xs text-ouro-claro">
                📦 Não cabe no armazém: precisa do {PREDIOS.armazem.nome} nível {armazemNecessario}.
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
}
