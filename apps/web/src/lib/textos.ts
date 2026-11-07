import {
  BALANCEAMENTO,
  type Especialidade,
  type Objetivo,
  type Raca,
  type Recurso,
  type Terreno,
  type TipoEstrutura,
  type TipoPredio,
  type TipoUnidade,
} from '@terra/regras';

export const TERRENOS_INFO: Record<Terreno, { nome: string; icone: string; efeito: string }> = {
  planicie: { nome: 'Planície', icone: '🌾', efeito: 'sem bônus de defesa' },
  floresta: { nome: 'Floresta', icone: '🌲', efeito: 'arqueiros defendem melhor' },
  montanha: { nome: 'Montanha', icone: '⛰️', efeito: 'bônus de defesa geral' },
};

export const PREDIOS: Record<TipoPredio, { nome: string; icone: string; descricao: string }> = {
  centro: { nome: 'Centro da Cidade', icone: '🏛️', descricao: 'Define o nível máximo de todos os outros prédios.' },
  casa: { nome: 'Casa', icone: '🏠', descricao: 'Aumenta o limite de população e o crescimento.' },
  fazenda: { nome: 'Fazenda', icone: '🌾', descricao: 'Trabalhadores produzem comida.' },
  serraria: { nome: 'Serraria', icone: '🪚', descricao: 'Trabalhadores produzem madeira.' },
  mercado: { nome: 'Mercado', icone: '⚖️', descricao: 'Trabalhadores produzem ouro.' },
  armazem: { nome: 'Armazém', icone: '📦', descricao: 'Guarda mais recursos e protege uma parte contra saques.' },
  quartel: { nome: 'Quartel', icone: '⚔️', descricao: 'Treina lanceiros, arqueiros e cavalaria.' },
  muralha: { nome: 'Muralha', icone: '🧱', descricao: 'Bônus de defesa para a cidade.' },
};

export const UNIDADES_INFO: Record<TipoUnidade, { nome: string; plural: string; icone: string; descricao: string }> = {
  lanceiro: { nome: 'Lanceiro', plural: 'Lanceiros', icone: '🔱', descricao: 'Barato e bom na defesa. Vence a cavalaria.' },
  arqueiro: { nome: 'Arqueiro', plural: 'Arqueiros', icone: '🏹', descricao: 'Dano alto, pouca resistência. Vence lanceiros.' },
  cavalaria: { nome: 'Cavalaria', plural: 'Cavalaria', icone: '🐎', descricao: 'Rápida, cara, ótima no saque. Vence arqueiros.' },
};

export const ESTRUTURAS_INFO: Record<TipoEstrutura, { nome: string; icone: string; descricao: string }> = {
  torre: {
    nome: 'Torre de vigia',
    icone: '🗼',
    descricao: 'Mostra marchas e batedores vindo para este território: de quem, quantos soldados e quando chegam.',
  },
  palicada: {
    nome: 'Paliçada',
    icone: '🪵',
    descricao: `+${Math.round(BALANCEAMENTO.bonusPalicada * 100)}% de defesa neste território (na cidade, soma com a muralha).`,
  },
  entreposto: {
    nome: 'Entreposto',
    icone: '🏪',
    descricao: `Multiplica por ${BALANCEAMENTO.multiplicadorEntreposto} o bônus de produção do terreno deste território.`,
  },
};

/** O que cada especialidade de herói faz (o bônus é o mesmo para todas: +2% por nível). */
export const ESPECIALIDADES_INFO: Record<Especialidade, { nome: string; icone: string; descricao: string }> = {
  comandante: { nome: 'Comandante', icone: '⚔️', descricao: 'Mais força de ataque na marcha em que ele vai.' },
  castelao: { nome: 'Castelão', icone: '🛡️', descricao: 'Mais defesa no território onde ele está.' },
  desbravador: { nome: 'Desbravador', icone: '🐎', descricao: 'Marchas com ele andam mais rápido, inclusive na volta.' },
  saqueador: { nome: 'Saqueador', icone: '💰', descricao: 'As tropas com ele carregam mais saque, de cidades e vilas.' },
  intendente: {
    nome: 'Intendente',
    icone: '📜',
    descricao: `Na cidade: mais produção de tudo e mais crescimento da população. Noutro território seu: ${BALANCEAMENTO.herois.multiplicadorIntendenteTerritorio}× o bônus, só no recurso daquele território.`,
  },
};

/** Raças: nome, plural (para "os orcs") e o resumo da vantagem e da desvantagem. */
export const RACAS_INFO: Record<Raca, { nome: string; plural: string; icone: string; vantagem: string; desvantagem: string }> = {
  humano: {
    nome: 'Humano',
    plural: 'humanos',
    icone: '🧑',
    vantagem: '+20% de crescimento da população e +10% no limite de população das casas.',
    desvantagem: 'Nenhuma: é o povo equilibrado.',
  },
  elfo: {
    nome: 'Elfo',
    plural: 'elfos',
    icone: '🧝',
    vantagem: '+20% de defesa em floresta e +10% de madeira.',
    desvantagem: 'A população cresce 10% mais devagar.',
  },
  orc: {
    nome: 'Orc',
    plural: 'orcs',
    icone: '🪓',
    vantagem: '+10% de força de ataque e +10% de carga de saque.',
    desvantagem: '−10% de defesa.',
  },
  anao: {
    nome: 'Anão',
    plural: 'anões',
    icone: '⛏️',
    vantagem: '+20% de defesa em montanha e +15% de ouro.',
    desvantagem: 'Marchas 15% mais lentas.',
  },
};

/** Título do vencedor da temporada anterior, mostrado junto do nome. */
export const TITULO_HERDEIRO = 'Herdeiro do Trono Caído';

export const RECURSOS_INFO: Record<Recurso, { nome: string; icone: string }> = {
  comida: { nome: 'Comida', icone: '🌾' },
  madeira: { nome: 'Madeira', icone: '🪵' },
  ouro: { nome: 'Ouro', icone: '🪙' },
};

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Arredonda para baixo: o jogador só pode gastar o que já foi produzido por inteiro. */
export function formatarNumero(valor: number): string {
  return numero.format(Math.floor(valor));
}

export function formatarTaxa(valorPorHora: number): string {
  return decimal.format(valorPorHora);
}

export function formatarDuracao(ms: number): string {
  const totalSeg = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  if (h > 0) return `${h} h ${String(min).padStart(2, '0')} min`;
  if (min > 0) return `${min} min${seg > 0 ? ` ${seg} s` : ''}`;
  return `${seg} s`;
}

/** Contagem curta para caber em caixas estreitas: "11:58" ou "1:05:09". */
export function formatarRelogio(ms: number): string {
  const totalSeg = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = String(totalSeg % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(min).padStart(2, '0')}:${seg}` : `${min}:${seg}`;
}

/** Texto da carta do objetivo secreto. */
export function descreverObjetivo(
  objetivo: Objetivo,
  nomes: { regiao: (id: string) => string; jogador: (id: string) => string },
): { icone: string; titulo: string; texto: string } {
  switch (objetivo.tipo) {
    case 'duas_regioes':
      return {
        icone: '🗺️',
        titulo: 'Senhor de duas terras',
        texto: `Conquiste todos os territórios de ${nomes.regiao(objetivo.regioes[0])} e de ${nomes.regiao(objetivo.regioes[1])}. Cidades principais de outros jogadores não contam, porque não podem ser conquistadas.`,
      };
    case 'metade_do_mapa':
      return {
        icone: '👑',
        titulo: 'Mais da metade do reino',
        texto: `Domine ${Math.round(BALANCEAMENTO.objetivos.fracaoMetadeDoMapa * 100)}% dos territórios que podem ser conquistados. Cidades principais de outros jogadores não contam.`,
      };
    case 'territorios_defendidos':
      return {
        icone: '🛡️',
        titulo: 'Fronteiras de ferro',
        texto: `Tenha ${objetivo.territorios} territórios com pelo menos ${objetivo.guarnicaoMinima} soldados seus em cada um.`,
      };
    case 'derrubar_rival':
      return {
        icone: '🗡️',
        titulo: 'A queda do rival',
        texto: `Reduza ${nomes.jogador(objetivo.rivalId)} apenas à cidade principal, conquistando você mesmo territórios dele. Se outro fizer isso antes, seu objetivo vira dominar mais da metade do mapa.`,
      };
    case 'populacao':
      return { icone: '🌾', titulo: 'Prosperidade', texto: `Chegue a ${objetivo.populacao} habitantes na sua cidade.` };
    case 'senhor_da_guerra':
      return {
        icone: '⚔️',
        titulo: 'Senhor da guerra',
        texto: `Vença ${objetivo.vitorias} batalhas contra outros jogadores, atacando ou defendendo. Batalhas contra bárbaros não contam.`,
      };
    case 'mestre_construtor':
      return {
        icone: '🏰',
        titulo: 'Mestre construtor',
        texto: `Leve ${objetivo.predios} prédios da sua cidade ao nível ${objetivo.nivel}. O Centro da Cidade precisa chegar lá primeiro.`,
      };
    case 'tesouro':
      return {
        icone: '💰',
        titulo: 'Tesouro do reino',
        texto: `Junte ${formatarNumero(objetivo.ouro)} de ouro guardado na sua cidade. Só cabe no Armazém nível máximo, e o ouro atrai saqueadores.`,
      };
    case 'velha_rixa':
      return {
        icone: '⚔️',
        titulo: 'Velha rixa',
        texto: `Os ${RACAS_INFO[objetivo.raca].plural} nunca pagaram pelo que fizeram ao seu povo. Conquiste ${objetivo.territorios} territórios diferentes de jogadores ${RACAS_INFO[objetivo.raca].plural}, ou deixe todos eles só com a cidade principal.`,
      };
    case 'monopolio_comercial':
      return {
        icone: '⚖️',
        titulo: 'Monopólio comercial',
        texto: `Controle todas as cidades livres do mapa ao mesmo tempo por ${objetivo.horas} horas seguidas. Se perder uma, o relógio recomeça.`,
      };
  }
}
