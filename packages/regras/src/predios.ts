import { BALANCEAMENTO } from './balanceamento.ts';
import type { NiveisPredios, Recursos, TipoPredio, Verificacao } from './tipos.ts';
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

export type MotivoRecusaEvolucao =
  | 'nivel_maximo'
  | 'acima_do_centro'
  | 'construcao_em_andamento'
  | 'recursos_insuficientes';

/**
 * Confere se a cidade pode construir/evoluir o prédio agora.
 * Regras do GDD: o Centro da Cidade limita o nível dos outros prédios e só há uma obra por vez.
 */
export function verificarEvolucao(entrada: {
  predios: NiveisPredios;
  tipo: TipoPredio;
  recursos: Recursos;
  construcaoEmAndamento: boolean;
}): Verificacao<{ nivelAlvo: number; custo: Recursos; tempoMs: number }, MotivoRecusaEvolucao> {
  const { predios, tipo, recursos, construcaoEmAndamento } = entrada;
  const nivelAlvo = predios[tipo] + 1;

  if (construcaoEmAndamento) return { ok: false, motivo: 'construcao_em_andamento' };
  if (nivelAlvo > BALANCEAMENTO.predios[tipo].nivelMaximo) return { ok: false, motivo: 'nivel_maximo' };
  if (tipo !== 'centro' && nivelAlvo > predios.centro) return { ok: false, motivo: 'acima_do_centro' };

  const custo = custoEvolucao(tipo, nivelAlvo);
  if (!temRecursos(recursos, custo)) return { ok: false, motivo: 'recursos_insuficientes' };

  return { ok: true, nivelAlvo, custo, tempoMs: tempoEvolucaoMs(tipo, nivelAlvo) };
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
