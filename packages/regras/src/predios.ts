import { BALANCEAMENTO } from './balanceamento.ts';
import type { NiveisPredios, Obra, Recursos, TipoPredio, Verificacao } from './tipos.ts';
import { MINUTO_MS, mapearRecursos, temRecursos } from './util.ts';

/** Custo para levar o prédio ao `nivelAlvo` (1 = construir). */
export function custoEvolucao(tipo: TipoPredio, nivelAlvo: number): Recursos {
  const { custoBase } = BALANCEAMENTO.predios[tipo];
  const fator = BALANCEAMENTO.crescimentoCusto ** (nivelAlvo - 1);
  return mapearRecursos((r) => Math.round(custoBase[r] * fator));
}

/** Duração da obra para levar o prédio ao `nivelAlvo`, em ms (arredondada ao segundo). */
export function tempoEvolucaoMs(tipo: TipoPredio, nivelAlvo: number): number {
  const minutos = BALANCEAMENTO.predios[tipo].tempoBaseMin * BALANCEAMENTO.crescimentoTempo ** (nivelAlvo - 1);
  return Math.round((minutos * MINUTO_MS) / 1000) * 1000;
}

export type MotivoRecusaEvolucao = 'nivel_maximo' | 'acima_do_centro' | 'fila_cheia' | 'recursos_insuficientes';

/** Níveis que os prédios terão quando todas as obras da fila terminarem. */
export function niveisProjetados(predios: NiveisPredios, obras: readonly Obra[]): NiveisPredios {
  const projetados = { ...predios };
  for (const obra of obras) projetados[obra.tipo]++;
  return projetados;
}

/**
 * Confere se a cidade pode pôr uma obra na fila (até `maxObrasNaFila`, feitas uma depois da outra).
 * O nível alvo e o limite do Centro da Cidade (GDD) contam as obras que já estão na fila: dá para
 * enfileirar o Centro e, logo depois, um prédio que só cabe com o Centro novo.
 */
export function verificarEvolucao(entrada: {
  predios: NiveisPredios;
  tipo: TipoPredio;
  recursos: Recursos;
  obras: readonly Obra[];
  agora: number;
}): Verificacao<{ nivelAlvo: number; custo: Recursos; tempoMs: number; prontoEm: number }, MotivoRecusaEvolucao> {
  const { predios, tipo, recursos, obras, agora } = entrada;
  const projetados = niveisProjetados(predios, obras);
  const nivelAlvo = projetados[tipo] + 1;

  if (nivelAlvo > BALANCEAMENTO.predios[tipo].nivelMaximo) return { ok: false, motivo: 'nivel_maximo' };
  if (obras.length >= BALANCEAMENTO.maxObrasNaFila) return { ok: false, motivo: 'fila_cheia' };
  if (tipo !== 'centro' && nivelAlvo > projetados.centro) return { ok: false, motivo: 'acima_do_centro' };

  const custo = custoEvolucao(tipo, nivelAlvo);
  if (!temRecursos(recursos, custo)) return { ok: false, motivo: 'recursos_insuficientes' };

  const tempoMs = tempoEvolucaoMs(tipo, nivelAlvo);
  const inicio = Math.max(agora, ...obras.map((o) => o.prontoEm));
  return { ok: true, nivelAlvo, custo, tempoMs, prontoEm: inicio + tempoMs };
}

/** Quanto falta de cada recurso para pagar `custo` (zero onde já há o suficiente). */
export function recursosQueFaltam(estoque: Recursos, custo: Recursos): Recursos {
  return mapearRecursos((r) => Math.max(0, Math.ceil(custo[r] - estoque[r])));
}

/** Máximo de cada recurso que a cidade guarda. */
export function capacidadeArmazem(nivelArmazem: number): number {
  const { capacidadeBase, capacidadePorNivel } = BALANCEAMENTO.armazem;
  return capacidadeBase + capacidadePorNivel * nivelArmazem;
}

/** Quanto de cada recurso fica fora do alcance de saques. */
export function protecaoArmazem(nivelArmazem: number): number {
  const { protecaoBase, protecaoPorNivel } = BALANCEAMENTO.armazem;
  return protecaoBase + protecaoPorNivel * nivelArmazem;
}

export function limitePopulacao(nivelCasa: number): number {
  const { limiteBase, limitePorNivelCasa } = BALANCEAMENTO.populacao;
  return limiteBase + limitePorNivelCasa * nivelCasa;
}

export function crescimentoPopulacaoHora(nivelCasa: number): number {
  const { crescimentoBaseHora, crescimentoPorNivelCasaHora } = BALANCEAMENTO.populacao;
  return crescimentoBaseHora + crescimentoPorNivelCasaHora * nivelCasa;
}

/** Cidade recém-fundada: só o Centro da Cidade nível 1, como no GDD. */
export function prediosIniciais(): NiveisPredios {
  return { centro: 1, casa: 0, fazenda: 0, serraria: 0, mercado: 0, armazem: 0, quartel: 0, muralha: 0 };
}
