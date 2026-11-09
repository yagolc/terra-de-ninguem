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
  4: {
    titulo: 'A Ascensão e a Queda do Rei Anão',
    paginas: [
      {
        titulo: 'I. A Ascensão',
        texto:
          'No caos que veio depois da Casa de Eduardo, quem primeiro pôs ordem foi um anão. Yago desceu das montanhas do leste com seu clã e não tentou tomar o mundo: escolheu oito terras e cercou cada uma de guarnições. Em quatro dias, as fronteiras de ferro estavam fechadas, e os clãs o aclamaram rei.',
      },
      {
        titulo: 'II. As Muralhas Invencíveis',
        texto:
          'Os humanos, que ainda cantavam as glórias da velha Casa, atacaram sem descanso e venceram batalha após batalha, mas toda vitória terminava diante de uma muralha anã. Yago morreu velho, dentro das suas fronteiras, e deixou aos filhos um reino que nenhum exército tinha conseguido romper.',
      },
      {
        titulo: 'III. Os Herdeiros',
        texto:
          'Geração após geração, os herdeiros de Yago viveram em paz atrás das muralhas. As guarnições viraram guarda de honra, as torres de vigia viraram depósitos, e ninguém mais subia nos muros para olhar o horizonte. Lá fora, os outros povos aprendiam, se armavam e cresciam, mas dentro do reino de ferro ninguém queria ouvir falar do perigo.',
      },
      {
        titulo: 'IV. A Queda',
        texto:
          'Quando os exércitos chegaram, encontraram portões que ninguém sabia mais defender. A muralha que tinha resistido a tudo caiu em uma noite. O último herdeiro fugiu com a coroa e um punhado de guardas fiéis, e a Terra de Ninguém voltou a não ter dono. Humanos, elfos, anões e orcs disputam de novo cada vale, e o herdeiro do trono caído jura reconquistar o que os seus perderam.',
      },
    ],
    chamada: 'Escolha seu povo. Funde sua cidade. Nenhuma muralha dura para sempre.',
  },
};
