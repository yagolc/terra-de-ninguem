import { BALANCEAMENTO } from './balanceamento.ts';
import {
  capacidadeArmazem,
  crescimentoPopulacaoHora,
  limitePopulacao,
  prediosIniciais,
} from './predios.ts';
import { RECURSOS, TIPOS_UNIDADE, type EstadoCidade, type Exercito, type LoteTreino, type NiveisPredios, type Obra, type Recurso, type Recursos, type TipoPredio, type Verificacao } from './tipos.ts';
import { HORA_MS, mapearExercito, mapearRecursos, recursos, totalUnidades } from './util.ts';

export const PREDIO_PRODUTOR: Record<Recurso, TipoPredio> = {
  comida: 'fazenda',
  madeira: 'serraria',
  ouro: 'mercado',
};

export function cidadeInicial(agora: number): EstadoCidade {
  return {
    recursos: { ...BALANCEAMENTO.cidadeInicial.recursos },
    populacao: BALANCEAMENTO.cidadeInicial.populacao,
    trabalhadores: recursos(),
    predios: prediosIniciais(),
    atualizadoEm: agora,
  };
}

/** Vagas de trabalhador em cada recurso, conforme o nível do prédio produtor. */
export function vagasTrabalho(predios: NiveisPredios): Recursos {
  return mapearRecursos((r) => predios[PREDIO_PRODUTOR[r]] * BALANCEAMENTO.producao.trabalhadoresPorNivel);
}

/**
 * Produção por hora de cada recurso.
 * @param bonusTerritorios bônus somados dos territórios do jogador (0,1 = +10%).
 */
export function producaoHora(cidade: EstadoCidade, bonusTerritorios: Recursos = recursos()): Recursos {
  const { porTrabalhadorHora, bonusPorNivel } = BALANCEAMENTO.producao;
  const vagas = vagasTrabalho(cidade.predios);

  return mapearRecursos((r) => {
    const nivel = cidade.predios[PREDIO_PRODUTOR[r]];
    if (nivel === 0) return 0;
    const trabalhadores = Math.min(cidade.trabalhadores[r], vagas[r]);
    return porTrabalhadorHora[r] * trabalhadores * (1 + bonusPorNivel * (nivel - 1)) * (1 + bonusTerritorios[r]);
  });
}

export function consumoComidaHora(tropas: Exercito): number {
  return TIPOS_UNIDADE.reduce((soma, tipo) => soma + tropas[tipo] * BALANCEAMENTO.unidades[tipo].consumoComidaHora, 0);
}

/** Soma uma taxa constante durante `horas`, sem passar do teto nem ficar negativo. Estoque acima do teto não é perdido. */
function acumular(valor: number, taxaHora: number, horas: number, teto: number): number {
  if (taxaHora < 0) return Math.max(0, valor + taxaHora * horas);
  return Math.max(valor, Math.min(teto, valor + taxaHora * horas));
}

export type ResultadoAtualizacao = {
  cidade: EstadoCidade;
  /** Todas as tropas do jogador depois da deserção. */
  tropas: Exercito;
  desertores: Exercito;
};

/**
 * Avança a cidade até `agora`: soma a produção do período, respeita o armazém, desconta a comida
 * das tropas e aplica a deserção se a comida acabar. Chamada pelo servidor antes de qualquer comando.
 *
 * Supõe que nada muda dentro do intervalo. Se uma obra termina no meio dele, o servidor deve
 * atualizar até o fim da obra, aplicar o novo nível e depois atualizar até `agora`.
 *
 * @param tropas todas as tropas do jogador (em territórios e em marcha): todas comem.
 */
export function atualizarCidade(entrada: {
  cidade: EstadoCidade;
  tropas: Exercito;
  agora: number;
  bonusTerritorios?: Recursos;
}): ResultadoAtualizacao {
  const { cidade, tropas, agora, bonusTerritorios } = entrada;
  const horas = Math.max(0, (agora - cidade.atualizadoEm) / HORA_MS);
  const teto = capacidadeArmazem(cidade.predios.armazem);
  const producao = producaoHora(cidade, bonusTerritorios);
  const consumo = consumoComidaHora(tropas);
  const saldoComida = producao.comida - consumo;

  // Comida: se o saldo é negativo, descobre quando o estoque zera; dali em diante as tropas passam fome.
  let comida: number;
  let horasDeFome = 0;
  if (saldoComida >= 0) {
    comida = acumular(cidade.recursos.comida, saldoComida, horas, teto);
  } else {
    const horasAteZerar = cidade.recursos.comida / -saldoComida;
    comida = Math.max(0, cidade.recursos.comida + saldoComida * horas);
    horasDeFome = Math.max(0, horas - horasAteZerar);
  }

  // Deserção: o excedente que a produção de comida não sustenta encolhe `desercaoHora` por hora de fome.
  let tropasDepois = tropas;
  if (horasDeFome > 0) {
    const sustentavel = producao.comida / consumo;
    const excedente = (1 - sustentavel) * (1 - BALANCEAMENTO.desercaoHora) ** horasDeFome;
    const fracaoQueFica = sustentavel + excedente;
    tropasDepois = mapearExercito((tipo) => Math.min(tropas[tipo], Math.round(tropas[tipo] * fracaoQueFica)));
  }
  const desertores = mapearExercito((tipo) => tropas[tipo] - tropasDepois[tipo]);

  const limite = limitePopulacao(cidade.predios.casa);
  const populacao = Math.max(
    0,
    acumular(cidade.populacao, crescimentoPopulacaoHora(cidade.predios.casa), horas, limite) - totalUnidades(desertores),
  );

  return {
    cidade: {
      ...cidade,
      recursos: {
        comida,
        madeira: acumular(cidade.recursos.madeira, producao.madeira, horas, teto),
        ouro: acumular(cidade.recursos.ouro, producao.ouro, horas, teto),
      },
      populacao,
      atualizadoEm: Math.max(agora, cidade.atualizadoEm),
    },
    tropas: tropasDepois,
    desertores,
  };
}

/**
 * Avança a cidade até `agora` aplicando, em ordem, as obras e os lotes de treino que terminam no
 * caminho: atualiza até cada evento, aplica (novo nível ou tropas novas, que passam a comer) e segue.
 * É a função que servidor e navegador usam para saber o estado atual da cidade.
 */
export function avancarCidade<O extends Obra, L extends LoteTreino>(entrada: {
  cidade: EstadoCidade;
  tropas: Exercito;
  obras?: readonly O[];
  treinos?: readonly L[];
  agora: number;
  bonusTerritorios?: Recursos;
}): ResultadoAtualizacao & {
  /** Obras ainda na fila (os mesmos objetos recebidos, para o servidor saber os ids). */
  obras: O[];
  obrasConcluidas: O[];
  treinos: L[];
  lotesConcluidos: L[];
} {
  const { obras = [], treinos = [], agora, bonusTerritorios } = entrada;
  const obrasConcluidas = obras.filter((o) => o.prontoEm <= agora);
  const lotesConcluidos = treinos.filter((l) => l.prontoEm <= agora);
  const eventos = [
    ...obrasConcluidas.map((obra) => ({ em: obra.prontoEm, obra })),
    ...lotesConcluidos.map((lote) => ({ em: lote.prontoEm, lote })),
  ].sort((a, b) => a.em - b.em);

  let cidade = entrada.cidade;
  let tropas = entrada.tropas;
  let desertores = mapearExercito(() => 0);
  const avancarAte = (instante: number) => {
    const r = atualizarCidade({ cidade, tropas, agora: instante, bonusTerritorios });
    cidade = r.cidade;
    tropas = r.tropas;
    desertores = mapearExercito((tipo) => desertores[tipo] + r.desertores[tipo]);
  };

  for (const evento of eventos) {
    avancarAte(evento.em);
    if ('obra' in evento) {
      cidade = { ...cidade, predios: { ...cidade.predios, [evento.obra.tipo]: cidade.predios[evento.obra.tipo] + 1 } };
    } else {
      tropas = { ...tropas, [evento.lote.tipo]: tropas[evento.lote.tipo] + evento.lote.quantidade };
    }
  }
  avancarAte(agora);

  return {
    cidade,
    tropas,
    desertores,
    obras: obras.filter((o) => o.prontoEm > agora),
    obrasConcluidas,
    treinos: treinos.filter((l) => l.prontoEm > agora),
    lotesConcluidos,
  };
}

/** Habitantes que não são trabalhadores nem soldados (inclui soldados em treino em `soldados`). */
export function habitantesLivres(cidade: EstadoCidade, soldados: number): number {
  const trabalhadores = RECURSOS.reduce((soma, r) => soma + cidade.trabalhadores[r], 0);
  return Math.floor(cidade.populacao) - trabalhadores - soldados;
}

export type MotivoRecusaAlocacao = 'valor_invalido' | 'acima_das_vagas' | 'populacao_insuficiente';

/** Confere uma nova distribuição de trabalhadores. Cada habitante é trabalhador ou soldado, nunca os dois. */
export function verificarAlocacao(entrada: {
  cidade: EstadoCidade;
  alocacao: Recursos;
  /** Soldados do jogador, incluindo os em treino. */
  soldados: number;
}): Verificacao<object, MotivoRecusaAlocacao> {
  const { cidade, alocacao, soldados } = entrada;
  if (RECURSOS.some((r) => !Number.isInteger(alocacao[r]) || alocacao[r] < 0)) {
    return { ok: false, motivo: 'valor_invalido' };
  }
  const vagas = vagasTrabalho(cidade.predios);
  if (RECURSOS.some((r) => alocacao[r] > vagas[r])) return { ok: false, motivo: 'acima_das_vagas' };

  const total = RECURSOS.reduce((soma, r) => soma + alocacao[r], 0);
  if (total + soldados > Math.floor(cidade.populacao)) return { ok: false, motivo: 'populacao_insuficiente' };
  return { ok: true };
}
