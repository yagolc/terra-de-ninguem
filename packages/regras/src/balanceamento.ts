// TODOS os números de balanceamento do jogo ficam aqui. Valores provisórios até o playtest (Épico 8).
// Tempos em minutos/segundos e taxas "por hora" para facilitar a leitura; as funções convertem para ms.
import type { Especialidade, Raca, Recursos, Terreno, TipoEstrutura, TipoPredio, TipoUnidade } from './tipos.ts';

/** Efeitos de uma raça (frações: 0,1 = +10%, −0,1 = −10%). O que não aparece é zero. */
type ConfigRaca = {
  producao?: Partial<Recursos>;
  crescimento?: number;
  /** Limite de população das casas a mais (0,1 = +10%). */
  populacaoMaxima?: number;
  ataque?: number;
  defesa?: number;
  defesaPorTerreno?: Partial<Record<Terreno, number>>;
  velocidade?: number;
  carga?: number;
};

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
    pombal: { custoBase: { comida: 30, madeira: 60, ouro: 20 }, tempoBaseMin: 3, nivelMaximo: 5 },
  } satisfies Record<TipoPredio, ConfigPredio>,
  crescimentoCusto: 1.5,
  /** Obras que podem esperar na fila da cidade (feitas uma depois da outra). */
  maxObrasNaFila: 3,
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
    /**
     * Capacidade sem armazém; cada nível multiplica por `crescimentoCapacidade` (arredondada a dezenas).
     * Cresce como os custos dos prédios, para a obra mais cara (Centro nível 10) caber no armazém máximo.
     */
    capacidadeBase: 1000,
    crescimentoCapacidade: 1.23,
    /** Quanto de cada recurso fica fora do alcance do saque. */
    protecaoBase: 100,
    protecaoPorNivel: 100,
  },

  /** Fração por hora do excedente de tropas (o que a comida não sustenta) que deserta. */
  desercaoHora: 0.1,

  unidades: {
    lanceiro: {
      ataque: 10, defesa: 15, velocidade: 20, carga: 20,
      custo: { comida: 30, madeira: 20, ouro: 0 }, tempoTreinoSeg: 60, consumoComidaHora: 1,
    },
    arqueiro: {
      ataque: 15, defesa: 10, velocidade: 20, carga: 10,
      custo: { comida: 30, madeira: 30, ouro: 5 }, tempoTreinoSeg: 90, consumoComidaHora: 1,
    },
    cavalaria: {
      ataque: 20, defesa: 12, velocidade: 40, carga: 40,
      custo: { comida: 60, madeira: 20, ouro: 25 }, tempoTreinoSeg: 150, consumoComidaHora: 2,
    },
  } satisfies Record<TipoUnidade, ConfigUnidade>,

  treino: {
    /** Redução do tempo de treino por nível do quartel acima do 1. */
    reducaoPorNivelQuartel: 0.05,
    reducaoMaxima: 0.5,
    /** Lotes que podem esperar na fila do quartel (treinados um depois do outro). */
    maxLotesNaFila: 5,
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
    perdaPerdedor: 0.7,
    /** Força de ataque mínima, em múltiplos da defesa, para conquistar um território. */
    margemConquista: 1.5,
  },

  saque: {
    /** Fração máxima do estoque desprotegido que um saque leva. */
    maximoDoDesprotegido: 0.3,
  },

  temporada: {
    /** Prazo para alguém cumprir o objetivo; depois vence quem tiver mais pontos. */
    duracaoDias: 21,
  },

  objetivos: {
    /** "Dominar mais da metade do mapa": fração dos territórios. */
    fracaoMetadeDoMapa: 0.55,
    /** "Fronteiras de ferro": territórios com a guarnição mínima em cada (no total, até 2/3 da população máxima das casas). */
    territoriosDefendidos: 10,
    guarnicaoMinima: 7,
    /**
     * "Senhor das vilas" (substitui "população" desde a temporada 4): esta fração das vilas do mapa, arredondada
     * para cima, todas no nível máximo (4 de 8 com 8 jogadores, 3 de 6 com 6).
     */
    fracaoVilas: 0.5,
    /** "Duas regiões": soma dos territórios da dupla entre essas frações do mapa. */
    duplaDeRegioesMin: 0.33,
    duplaDeRegioesMax: 0.5,
    /** "Senhor da guerra": batalhas vencidas contra jogadores (atacando ou defendendo). */
    vitoriasContraJogadores: 50,
    /** "Mestre construtor": quantos prédios da cidade no nível pedido (o Centro tem de chegar lá primeiro). */
    mestreConstrutorPredios: 3,
    mestreConstrutorNivel: 10,
    /** "Tesouro do reino": ouro guardado (pede Armazém nível 10, o máximo). */
    ouroGuardado: 7500,
    /** "Monopólio comercial": horas seguidas com todas as cidades livres. */
    monopolioHoras: 12,
    /**
     * Quem cumpre o objetivo secreto vence se o mantiver cumprido por estas horas seguidas (desde a temporada 5). O
     * relógio é público (o tipo do objetivo continua secreto) e, enquanto ele corre, o jogador fica sem escudo.
     */
    segurarHoras: 4,
    /** "Velha rixa": territórios diferentes conquistados de jogadores da raça rival. */
    rixaTerritorios: 10,
    /** "Velha rixa" só mira raças de vizinhos: jogadores com a cidade a até tantas fronteiras (desde a temporada 5). */
    rixaDistanciaMaxima: 4,
    /**
     * "Duas regiões": a região vizinha da cidade precisa começar a pelo menos tantas fronteiras dela e ter a cidade
     * inicial de outro jogador (desde a temporada 5), para não sair uma dupla fácil demais.
     */
    vizinhaDistanciaMinima: 2,
  },

  pontos: {
    porTerritorio: 10,
    porHabitante: 1,
    porVitoria: 5,
  },

  protecoes: {
    /** Começo de temporada sem ataques entre jogadores (neutros podem ser atacados). */
    inicianteHoras: 48,
    /** Escudo de quem perde uma defesa. Atacar alguém quebra o próprio escudo. */
    escudoHoras: 8,
  },

  marcha: {
    duracaoMinimaMin: 10,
  },

  /** Pombos-correio: cartas entre jogadores, que voam da cidade de um à do outro, e propostas de pacto. */
  pombos: {
    /** Léguas por hora com o Pombal no nível 1 (a cavalaria anda 40). */
    velocidade: 60,
    /** Velocidade a mais por nível do Pombal acima do 1 (0,25 = +25% por nível). */
    bonusVelocidadePorNivel: 0.25,
    /** Cartas voando ao mesmo tempo por nível do Pombal. */
    pombosPorNivel: 2,
    duracaoMinimaMin: 2,
    /** Letras de uma carta (a tabela `cartas` tem o mesmo `check`). */
    tamanhoTexto: 500,
    /** Pacto de não agressão: dura de 1 a 12 horas desde o aceite; a proposta pode ser respondida por algumas horas depois de chegar. */
    pacto: { horasMinimas: 1, horasMaximas: 12, validadePropostaHoras: 6 },
  },

  /** Estruturas dos territórios: pagas com comida e ouro, uma por território, destruídas se o território for conquistado. */
  estruturas: {
    torre: { custo: { comida: 80, madeira: 0, ouro: 40 }, tempoMin: 20 },
    palicada: { custo: { comida: 150, madeira: 0, ouro: 60 }, tempoMin: 30 },
    entreposto: { custo: { comida: 120, madeira: 0, ouro: 50 }, tempoMin: 30 },
    // Recruta tropas direto na frente de batalha: caro de propósito (desde a temporada 5).
    acampamento: { custo: { comida: 300, madeira: 400, ouro: 200 }, tempoMin: 120 },
  } satisfies Record<TipoEstrutura, { custo: Recursos; tempoMin: number }>,
  /**
   * Acampamento militar: só em território conquistado (nunca na cidade principal) e no máximo tantos por jogador.
   * O Quartel da cidade treina e as tropas ficam prontas lá; os soldados saem da população da cidade como sempre.
   */
  acampamento: { maximoPorJogador: 1 },
  /** Bônus de defesa da paliçada no território dela (soma com a muralha na cidade). */
  bonusPalicada: 0.2,
  /**
   * Estrada: à parte da estrutura do território (dá para ter as duas), visível para todos e destruída na conquista.
   * Marcha de movimento entre dois territórios próprios com estrada pronta (saída e chegada) anda mais rápido.
   */
  estrada: { custo: { comida: 0, madeira: 150, ouro: 30 }, tempoMin: 30, multiplicadorVelocidade: 2 },
  /** O entreposto multiplica o bônus de produção do terreno (2 = +10% vira +20%). */
  multiplicadorEntreposto: 2,

  /** Povoados (vilas e cidades livres): posicionados pelo gerador de mapa, um por território no máximo. */
  povoados: {
    /** Fração dos territórios (fora cidades iniciais e cidades livres) que ganham uma vila. */
    fracaoVilas: 0.3,
    /** Cidades livres no mapa: metade do número de jogadores, arredondada, e no mínimo 3 (4 com 7 ou 8 jogadores). */
    cidadesLivresMinimo: 3,
    cidadesLivresPorJogador: 0.5,
    /** Horas até um povoado tomado de outro jogador passar a dar bônus ao novo dono. */
    lealdadeHoras: 24,
    vila: {
      /** Estoque cheio de uma vila neutra; o saque leva o que couber na carga e ele volta a encher aos poucos. */
      estoque: { comida: 300, madeira: 300, ouro: 120 },
      horasParaEncher: 8,
      nivelMaximo: 3,
      /** População máxima a mais na cidade do dono, por nível da vila. */
      populacaoPorNivel: 5,
      /** Custo de levar a vila a um nível, multiplicado pelo nível (a primeira conquista já dá o nível 1). */
      custoPorNivel: { comida: 0, madeira: 150, ouro: 50 },
      /** Parte do que foi investido nos níveis que leva quem saqueia a vila de outro jogador (ela volta ao nível 0). */
      fracaoSaqueInvestido: 0.5,
      /** Guarda da vila neutra, em múltiplos dos bárbaros daquela distância. */
      guarda: 0.5,
    },
    cidadeLivre: {
      ouroHora: 60,
      guarda: 3,
      /** Muralha própria: vale para quem estiver defendendo, bárbaros ou jogador. */
      bonusDefesa: 0.3,
      /**
       * Lanceiros de milícia que juram lealdade a quem conquista a cidade livre pela primeira vez. Ficam lá
       * defendendo, sem ocupar população nem comer; não marcham e se dispersam se a cidade for tomada.
       */
      milicia: 5,
    },
  },

  /** Heróis: um por jogador na temporada, com nome e especialidade; o ouro do treino é o ralo da economia. */
  herois: {
    custoRecrutar: { comida: 0, madeira: 0, ouro: 300 },
    nivelQuartelMinimo: 1,
    nivelMaximo: 10,
    /**
     * Bônus da especialidade por nível (0,02 = +2% por nível, +20% no nível 10). O intendente rende sempre, parado
     * na cidade; os de guerra só ajudam na marcha ou no território e arriscam ferimento, por isso valem mais.
     */
    bonusPorNivel: { comandante: 0.03, castelao: 0.04, desbravador: 0.04, saqueador: 0.04, intendente: 0.02 } satisfies Record<
      Especialidade,
      number
    >,
    /** Treino para o nível n: ouro = ouroBase × crescimentoOuro^(n−2); tempo = minutosBase × crescimentoTempo^(n−2). */
    treino: { ouroBase: 200, crescimentoOuro: 1.5, minutosBase: 60, crescimentoTempo: 1.3 },
    /** Horas fora de combate depois de perder uma batalha (ele nunca morre). */
    feridoHoras: 6,
    /** O intendente fora da cidade rende este múltiplo do bônus, só no recurso daquele território. */
    multiplicadorIntendenteTerritorio: 2,
    nomeMinimo: 2,
    nomeMaximo: 20,
  },

  /** Raças: vantagem e desvantagem pequenas; somam com o herói. */
  racas: {
    humano: { crescimento: 0.2, populacaoMaxima: 0.1 },
    elfo: { producao: { madeira: 0.2 }, defesaPorTerreno: { floresta: 0.2 }, crescimento: -0.1 },
    orc: { ataque: 0.1, carga: 0.1, defesa: -0.1 },
    anao: { producao: { ouro: 0.15 }, defesaPorTerreno: { montanha: 0.2 }, velocidade: -0.15 },
  } satisfies Record<Raca, ConfigRaca>,

  /**
   * Hordas bárbaras: uma a cada `intervaloHoras`, a partir do fim da proteção de iniciante, contra um dos
   * `primeirosDoPlacar`. Todos a veem `avisoHoras` antes de chegar. Começa pequena e cresce a cada horda.
   */
  hordas: {
    intervaloHoras: 24,
    avisoHoras: 6,
    primeirosDoPlacar: 3,
    unidadesBase: 5,
    unidadesPorHorda: 5,
    variacao: 0.1,
    ouroBase: 60,
    ouroPorHorda: 30,
  },

  /** Recompensa de cada missão de início (ver `missoes.ts`): um empurrão nos primeiros dias. */
  missoes: {
    casa_2: { comida: 50, madeira: 100, ouro: 0 },
    quartel: { comida: 100, madeira: 100, ouro: 0 },
    soldados_5: { comida: 150, madeira: 100, ouro: 0 },
    batedor: { comida: 0, madeira: 0, ouro: 60 },
    primeiro_territorio: { comida: 200, madeira: 200, ouro: 50 },
    armazem_3: { comida: 0, madeira: 200, ouro: 0 },
    construcao: { comida: 100, madeira: 0, ouro: 50 },
    heroi: { comida: 0, madeira: 0, ouro: 150 },
  },

  /** Herdeiro do trono: o vencedor da temporada anterior começa protegido, mas vira alvo. */
  herdeiro: {
    /** Lanceiros na cidade dele, fora da população: não comem, não marcham e não voltam se morrerem. */
    guardaReal: 10,
    /** Pontos a mais no placar por batalha vencida contra o herdeiro (a vitória normal já vale `pontos.porVitoria`). */
    pontosPorVitoria: 10,
  },

  /**
   * Loja de gemas: só se ganha gema comprando (Pix, 1 gema = `reaisPorGema` reais). Terminar a obra que está sendo
   * feita na hora custa `precoBase` gemas e dobra a cada uso na mesma temporada (2, 4, 8, 16…); a temporada nova
   * volta ao preço base. Não vale para níveis acima de `nivelMaximoTerminar` nem para os prédios de
   * `prediosProibidos` (não compra objetivo nem defesa de última hora).
   */
  loja: {
    reaisPorGema: 1,
    /** Pacotes de gemas à venda. */
    pacotes: [2, 4, 8, 16, 32],
    terminarObra: {
      precoBase: 2,
      nivelMaximo: 7,
      prediosProibidos: ['muralha'] as readonly TipoPredio[],
    },
    /** Pedidos de gemas esperando o Pix ser conferido, por jogador. */
    pedidosPendentesMaximo: 3,
    /**
     * Itens da loja. `permanente`: comprado uma vez, vale em todas as temporadas (o `titulo` é um por título).
     * `temporada`: vale até a temporada acabar e pode ser comprado de novo na próxima.
     */
    itens: {
      bandeiras_exclusivas: { preco: 10, escopo: 'permanente' },
      titulo: { preco: 5, escopo: 'permanente' },
      cor_ouro: { preco: 8, escopo: 'permanente' },
      cor_prata: { preco: 8, escopo: 'permanente' },
      destaque_cidade: { preco: 5, escopo: 'temporada' },
    },
  },

  reconhecimento: {
    /** Custo de mandar um batedor. */
    custoOuro: 20,
    /** Léguas por hora (o batedor vai a cavalo). */
    velocidade: 40,
    duracaoMinimaMin: 5,
  },

  mapa: {
    /** Tamanho do mapa em léguas (mesma unidade da velocidade das tropas). */
    largura: 60,
    altura: 40,
    /** Até esse número de territórios o mapa tem largura × altura; acima, a área cresce junto, e cada território mantém o tamanho. */
    territoriosNoTamanhoBase: 30,
    jogadoresMaximo: 8,
    territoriosBase: 6,
    territoriosPorJogador: 6,
    /**
     * Rios e cordilheiras: esta fração das fronteiras entre regiões vira barreira (não dá para atravessar). O mapa
     * continua todo ligado e nenhum território fica com menos de `vizinhosMinimos` vizinhos.
     */
    barreiras: { fracaoEntreRegioes: 0.5, vizinhosMinimos: 2 },
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
