// Crônicas do Reino: a lore de cada temporada, mostrada na primeira entrada e relida na tela Regras.
// Cada temporada nova ganha um capítulo aqui (escrito antes de rodar `temporada:nova`).

export type Capitulo = { titulo: string; paginas: { titulo: string; texto: string }[]; chamada: string };

export const CRONICAS: Record<number, Capitulo> = {
  3: {
    titulo: 'A Queda da Casa de Eduardo',
    paginas: [
      {
        titulo: 'I. O Rei Eduardo',
        texto:
          'Quando a poeira da segunda guerra baixou, um estandarte restava de pé. Eduardo uniu duas terras sob uma só coroa, e a Terra de Ninguém, pela primeira vez, teve um dono. Foi o começo da Casa de Eduardo, que reinaria por séculos.',
      },
      {
        titulo: 'II. A Era da Estabilidade',
        texto:
          'Sob a Casa de Eduardo, as estradas ficaram seguras, os portos se abriram e as notícias cruzaram o mar. Do outro lado, povos antigos ouviram falar de um continente em paz e cheio de terras férteis. Os elfos vieram das florestas do oeste, os anões das montanhas do leste e os orcs das estepes do sul.',
      },
      {
        titulo: 'III. A Queda',
        texto:
          'Mas um reino feito para um povo só não aguentou quatro. Clãs disputaram vales, guildas compraram conselheiros e velhas rixas atravessaram o mar junto com os navios. O último rei da Casa de Eduardo viu a coroa escorregar das mãos, e o trono ficou vazio.',
      },
      {
        titulo: 'IV. Terra de Ninguém',
        texto:
          'Os estandartes reais foram arrancados das muralhas. Agora humanos, elfos, anões e orcs disputam cada vila, cada estrada e cada cidade livre. A coroa espera por quem tiver força, e astúcia, para reunir todos eles.',
      },
    ],
    chamada: 'Escolha seu povo. Funde sua cidade.',
  },
};
