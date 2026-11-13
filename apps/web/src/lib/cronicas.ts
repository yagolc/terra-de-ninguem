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
  5: {
    titulo: 'A Coroa de Três Dias',
    paginas: [
      {
        titulo: 'I. O Trono Vazio',
        texto:
          'Depois que a muralha anã caiu, o trono ficou vazio por uma geração inteira. O último herdeiro de Yago vagava pelas montanhas com a coroa embrulhada num manto e meia dúzia de guardas que já tinham esquecido o próprio nome. Nos vales, cada senhor se dizia rei do seu pedaço de terra, e nenhum deles durava mais que um inverno. Os bardos pararam de compor hinos: ninguém sabia mais a quem cantar.',
      },
      {
        titulo: 'II. O Nome Antigo',
        texto:
          'Foi então que um elfo saiu das florestas do oeste e se apresentou com um nome que todos conheciam: Eduardo. Os velhos diziam que ele descendia de uma princesa élfica que tinha se casado com o primeiro rei, e que o sangue da Casa de Eduardo corria nas suas veias. Os jovens diziam que ele só tinha roubado o nome para ganhar seguidores. Eduardo nunca respondeu a nenhum dos dois. Juntou os arqueiros da floresta, afiou as flechas e esperou a primeira lua cheia.',
      },
      {
        titulo: 'III. A Guerra Relâmpago',
        texto:
          'Eduardo tinha estudado a queda do rei anão e copiou exatamente o que tinha dado certo para ele: escolheu dez terras, cercou cada uma de guarnições e não deixou nenhuma sem soldados. Venceu quarenta batalhas sem descanso, uma atrás da outra, antes que os outros povos entendessem que a guerra tinha começado. Em pouco mais de dois dias, as fronteiras de ferro estavam fechadas de novo, agora com bandeiras élficas. Os anões de Khiraz-Dúm chegaram com machados prontos e encontraram os portões já trancados.',
      },
      {
        titulo: 'IV. O Rei que Não Lia Cartas',
        texto:
          'Eduardo acreditava que dez fortalezas bastavam e que rei não negocia. Quando os senhores dos vales mandaram mensageiros oferecendo lealdade em troca de proteção, ele mandou os mensageiros de volta sem resposta. Quando chegaram os primeiros pombos, mandou queimar as cartas sem abrir. Seu exército estava espalhado em dez guarnições, uma em cada fronteira, e nenhuma forte o bastante para socorrer as outras. Ele tinha muralhas por toda parte e nenhum amigo em lugar nenhum.',
      },
      {
        titulo: 'V. A Noite dos Mil Pombos',
        texto:
          'As cartas que Eduardo queimava eram lidas por todos os outros. Humanos, anões e orcs, que nunca tinham concordado em nada, combinaram pactos para não se atacar e abriram as próprias terras para que exércitos amigos passassem. Nas fronteiras do reino élfico surgiram acampamentos de guerra, de onde soldados saíam prontos para a linha de frente. Numa única noite, todos atacaram as dez fortalezas ao mesmo tempo, e nenhuma pôde ajudar a outra. O reino que tinha nascido em três dias caiu em uma, e o herdeiro de Eduardo fugiu para o oeste com a Guarda Real e a coroa.',
      },
      {
        titulo: 'VI. A Lei da Vigília',
        texto:
          'Nas ruínas da última fortaleza élfica, os povos se reuniram e fizeram um juramento: ninguém mais seria rei num susto. Quem quiser a coroa vai ter de segurá-la sob os olhos de todos, até o relógio da torre virar quatro vezes, sem escudo que o proteja e sem pacto que o salve. Chamaram essa lei de Vigília, e todo pretendente sabe que, nessas horas, o mundo inteiro vai se voltar contra ele. A Terra de Ninguém voltou a não ter dono, e o herdeiro de Eduardo jura que vai voltar para buscar o que é seu.',
      },
    ],
    chamada: 'Escolha seu povo. Funde sua cidade. Desta vez, a coroa precisa ser segurada.',
  },
};
