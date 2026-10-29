// TODOS os números de balanceamento do jogo ficam aqui. Valores provisórios até o playtest (Épico 8).
// Tempos em minutos/segundos e taxas "por hora" para facilitar a leitura; as funções convertem para ms.
import type { Recursos, TipoPredio, TipoUnidade } from './tipos.ts';

type ConfigPredio = {
  /** Custo para construir o nível 1. Os níveis seguintes multiplicam por `crescimentoCusto`. */
  custoBase: Recursos;
  /** Tempo para construir o nível 1, em minutos. Os seguintes multiplicam por `crescimentoTempo`. */
  tempoBaseMin: number;
  nivelMaximo: number;
};

type ConfigUnidade = {
  ataque: number;
  defesa: number;
  /** Léguas por hora (unidade de distância do mapa). */
  velocidade: number;
  /** Quanto de recurso cada unidade carrega num saque. */
  carga: number;
  custo: Recursos;
  tempoTreinoSeg: number;
  consumoComidaHora: number;
};

export const BALANCEAMENTO = {
  cidadeInicial: {
    recursos: { comida: 300, madeira: 300, ouro: 100 } satisfies Recursos,
    populacao: 10,
  },

  predios: {
    centro: { custoBase: { comida: 0, madeira: 200, ouro: 100 }, tempoBaseMin: 10, nivelMaximo: 10 },
    casa: { custoBase: { comida: 0, madeira: 60, ouro: 0 }, tempoBaseMin: 3, nivelMaximo: 10 },
    fazenda: { custoBase: { comida: 0, madeira: 50, ouro: 0 }, tempoBaseMin: 2, nivelMaximo: 10 },
    serraria: { custoBase: { comida: 20, madeira: 40, ouro: 0 }, tempoBaseMin: 2, nivelMaximo: 10 },
    mercado: { custoBase: { comida: 40, madeira: 80, ouro: 0 }, tempoBaseMin: 4, nivelMaximo: 10 },
    armazem: { custoBase: { comida: 0, madeira: 80, ouro: 0 }, tempoBaseMin: 3, nivelMaximo: 10 },
    quartel: { custoBase: { comida: 0, madeira: 120, ouro: 20 }, tempoBaseMin: 6, nivelMaximo: 10 },
    muralha: { custoBase: { comida: 0, madeira: 100, ouro: 30 }, tempoBaseMin: 5, nivelMaximo: 10 },
  } satisfies Record<TipoPredio, ConfigPredio>,
  crescimentoCusto: 1.5,
  crescimentoTempo: 1.6,

  producao: {
    /** Recurso produzido por trabalhador por hora, com o prédio no nível 1. */
    porTrabalhadorHora: { comida: 12, madeira: 10, ouro: 4 } satisfies Recursos,
    /** Bônus de produção por nível acima do 1 (0,1 = +10% por nível). */
    bonusPorNivel: 0.1,
    /** Vagas de trabalhador por nível do prédio produtor. */
    trabalhadoresPorNivel: 5,
  },

  populacao: {
    limiteBase: 10,
    limitePorNivelCasa: 10,
    crescimentoBaseHora: 2,
    crescimentoPorNivelCasaHora: 0.5,
  },

  armazem: {
    capacidadeBase: 600,
    capacidadePorNivel: 400,
    /** Quanto de cada recurso fica fora do alcance do saque. */
    protecaoBase: 100,
    protecaoPorNivel: 100,
  },

  /** Fração por hora do excedente de tropas (o que a comida não sustenta) que deserta. */
  desercaoHora: 0.1,

  unidades: {
    lanceiro: {
      ataque: 10, defesa: 15, velocidade: 5, carga: 20,
      custo: { comida: 30, madeira: 20, ouro: 0 }, tempoTreinoSeg: 60, consumoComidaHora: 1,
    },
    arqueiro: {
      ataque: 15, defesa: 10, velocidade: 5, carga: 10,
      custo: { comida: 30, madeira: 30, ouro: 5 }, tempoTreinoSeg: 90, consumoComidaHora: 1,
    },
    cavalaria: {
      ataque: 20, defesa: 12, velocidade: 10, carga: 40,
      custo: { comida: 60, madeira: 20, ouro: 25 }, tempoTreinoSeg: 150, consumoComidaHora: 2,
    },
  } satisfies Record<TipoUnidade, ConfigUnidade>,

  treino: {
    /** Redução do tempo de treino por nível do quartel acima do 1. */
    reducaoPorNivelQuartel: 0.05,
    reducaoMaxima: 0.5,
  },

  batalha: {
    /** Multiplicador de dano contra o tipo que a unidade vence (triângulo de vantagens). */
    multiplicadorVantagem: 2,
    /** Variação aleatória máxima da força do atacante (0,1 = ±10%). */
    sorteMaxima: 0.1,
    bonusMuralhaPorNivel: 0.08,
    bonusMontanha: 0.25,
    bonusFlorestaArqueiro: 0.3,
    /** Fração perdida pelo vencedor = (força menor / força maior) ^ expoente. */
    expoentePerdasVencedor: 1.5,
    /** Fração do exército perdida por quem perde a batalha. */
    perdaPerdedor: 1,
    /** Força de ataque mínima, em múltiplos da defesa, para conquistar um território. */
    margemConquista: 1.5,
  },

  saque: {
    /** Fração máxima do estoque desprotegido que um saque leva. */
    maximoDoDesprotegido: 0.3,
  },

  marcha: {
    duracaoMinimaMin: 10,
  },

  mapa: {
    /** Tamanho do mapa em léguas (mesma unidade da velocidade das tropas). */
    largura: 60,
    altura: 40,
    territoriosBase: 6,
    territoriosPorJogador: 4,
    /** Com pelo menos esse número de territórios, o mapa tem 6 regiões; abaixo, 5. */
    territoriosPara6Regioes: 24,
    /** Bônus de produção de cada território no recurso ligado ao terreno (0,1 = +10%). */
    bonusTerritorio: 0.1,
    /** Chance de um território seguir o terreno predominante da região. */
    chanceTerrenoDaRegiao: 0.6,
    pesosTerreno: { planicie: 0.5, floresta: 0.3, montanha: 0.2 },
    /** Mapas candidatos gerados para escolher o mais equilibrado. */
    tentativas: 25,
  },

  /** Guarnição bárbara dos territórios neutros: mais forte quanto mais longe das cidades. */
  barbaros: {
    unidadesBase: 8,
    unidadesPorDistancia: 6,
    variacao: 0.3,
  },
} as const;
