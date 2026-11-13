// Desenho das formas do emblema: caminhos SVG num quadro de -50 a 50 (a forma no tamanho 1 ocupa o emblema todo).
import type { CamadaEmblema, FormaEmblema } from '@terra/regras';

/**
 * `d`: um caminho, ou várias partes (desenhadas uma por cima da outra, sem abrir buraco onde se sobrepõem).
 * `furos` (anel, olho, chave): regra par-ímpar em cada parte.
 */
type Forma = { nome: string; d: string | readonly string[]; furos?: boolean };

export const FORMAS: Record<FormaEmblema, Forma> = {
  // Exclusivas do pacote de bandeiras da loja.
  estrela8: {
    nome: 'Estrela de 8',
    d: 'M0-50L8-19.4L35.4-35.4L19.4-8L50 0L19.4 8L35.4 35.4L8 19.4L0 50L-8 19.4L-35.4 35.4L-19.4 8L-50 0L-19.4-8L-35.4-35.4L-8-19.4Z',
  },
  cruz_malta: {
    nome: 'Cruz de Malta',
    d: ['M0-8L-22-50L0-38L22-50Z', 'M8 0L50-22L38 0L50 22Z', 'M0 8L22 50L0 38L-22 50Z', 'M-8 0L-50 22L-38 0L-50-22Z'],
  },
  trevo: {
    nome: 'Trevo',
    d: [
      'M0-46A20 20 0 1 1 0-6A20 20 0 1 1 0-46Z',
      'M-22-14A20 20 0 1 1-22 26A20 20 0 1 1-22-14Z',
      'M22-14A20 20 0 1 1 22 26A20 20 0 1 1 22-14Z',
      'M-4 10H4V50H-4Z',
    ],
  },
  diamante: { nome: 'Diamante', d: 'M-28-34H28L50-10L0 50L-50-10Z' },
  circulo: { nome: 'Círculo', d: 'M0-50A50 50 0 1 1 0 50A50 50 0 1 1 0-50Z' },
  anel: { nome: 'Anel', d: 'M0-50A50 50 0 1 1 0 50A50 50 0 1 1 0-50ZM0-37A37 37 0 1 0 0 37A37 37 0 1 0 0-37Z', furos: true },
  semicirculo: { nome: 'Meio círculo', d: 'M-50 25A50 50 0 0 1 50 25Z' },
  arco: { nome: 'Arco', d: 'M-50 25A50 50 0 0 1 50 25H36A36 36 0 0 0-36 25Z' },
  meia_lua: { nome: 'Meia-lua', d: 'M29.4-40.4A50 50 0 1 0 29.4 40.4A42 42 0 1 1 29.4-40.4Z' },
  quadrado: { nome: 'Quadrado', d: 'M-50-50H50V50H-50Z' },
  barra: { nome: 'Barra', d: 'M-50-11H50V11H-50Z' },
  losango: { nome: 'Losango', d: 'M0-50L36 0L0 50L-36 0Z' },
  triangulo: { nome: 'Triângulo', d: 'M0-46L50 40H-50Z' },
  canto: { nome: 'Canto', d: 'M-50-50L50 50H-50Z' },
  pentagono: { nome: 'Pentágono', d: 'M0-50L47.6-15.5L29.4 40.5H-29.4L-47.6-15.5Z' },
  hexagono: { nome: 'Hexágono', d: 'M0-50L43.3-25V25L0 50L-43.3 25V-25Z' },
  estrela: {
    nome: 'Estrela',
    d: 'M0-50L11.8-16.2L47.6-15.5L19 6.2L29.4 40.5L0 20L-29.4 40.5L-19 6.2L-47.6-15.5L-11.8-16.2Z',
  },
  estrela4: { nome: 'Estrela de 4', d: 'M0-50L9.2-9.2L50 0L9.2 9.2L0 50L-9.2 9.2L-50 0L-9.2-9.2Z' },
  sol: {
    nome: 'Sol',
    d: 'M0-50L8.5-31.9L25-43.3L23.3-23.3L43.3-25L31.9-8.5L50 0L31.9 8.5L43.3 25L23.3 23.3L25 43.3L8.5 31.9L0 50L-8.5 31.9L-25 43.3L-23.3 23.3L-43.3 25L-31.9 8.5L-50 0L-31.9-8.5L-43.3-25L-23.3-23.3L-25-43.3L-8.5-31.9Z',
  },
  chevron: { nome: 'Divisa', d: 'M-50 0L0-36L50 0V24L0-12L-50 24Z' },
  seta: { nome: 'Seta', d: 'M0-50L32-12H11V50H-11V-12H-32Z' },
  cruz: { nome: 'Cruz', d: 'M-13-50H13V-13H50V13H13V50H-13V13H-50V-13H-13Z' },
  cruz_pata: { nome: 'Cruz pátea', d: 'M-16-50H16L7-7L50-16V16L7 7L16 50H-16L-7 7L-50 16V-16L-7-7Z' },
  escudo: { nome: 'Escudo', d: 'M-42-50H42V-6C42 20 24 38 0 50C-24 38-42 20-42-6Z' },
  coroa: { nome: 'Coroa', d: 'M-48 22L-44-30L-22 0L0-40L22 0L44-30L48 22ZM-48 28H48V44H-48Z' },
  torre: {
    nome: 'Torre',
    d: 'M-38 50V-22H-46V-50H-30V-38H-16V-50H16V-38H30V-50H46V-22H38V50H12V24A12 12 0 0 0-12 24V50Z',
  },
  espada: {
    nome: 'Espada',
    d: 'M0-50L7-40V16H24V25H7V36H-7V25H-24V16H-7V-40ZM0 37L7 44L0 51L-7 44Z',
  },
  lamina: { nome: 'Lâmina', d: 'M0-50C12-30 14 10 6 50H-6C-14 10-12-30 0-50Z' },
  garras: {
    nome: 'Garras',
    d: 'M-38-50C-30-20-26 10-30 50C-18 14-20-20-38-50ZM-6-50C2-20 6 10 2 50C14 14 12-20-6-50ZM26-50C34-20 38 10 34 50C46 14 44-20 26-50Z',
  },
  raio: { nome: 'Raio', d: 'M12-50L-30 6H-3L-16 50L30-10H3L18-50Z' },
  chama: {
    nome: 'Chama',
    d: 'M2-50C22-30 40-12 36 14C33 36 18 50 0 50C-18 50-34 36-36 16C-38-6-24-18-16-34C-10-22-6-16 0-14C4-26 4-38 2-50Z',
  },
  gota: { nome: 'Gota', d: 'M0-50C20-22 34-4 34 16A34 34 0 1 1-34 16C-34-4-20-22 0-50Z' },
  folha: { nome: 'Folha', d: 'M0-50C30-30 30 30 0 50C-30 30-30-30 0-50Z' },
  asa: {
    nome: 'Asa',
    d: 'M-50 34C-42-8-14-38 50-50C42-34 32-24 14-16C32-14 40-8 44-2C26 4 8 6-4 8C10 14 16 20 18 28C-6 26-28 28-50 34Z',
  },
  coracao: { nome: 'Coração', d: 'M0 46C-62 4-42-52 0-22C42-52 62 4 0 46Z' },
  olho: {
    nome: 'Olho',
    d: 'M-50 0C-30-32 30-32 50 0C30 32-30 32-50 0ZM0-15A15 15 0 1 0 0 15A15 15 0 1 0 0-15Z',
    furos: true,
  },
  onda: { nome: 'Onda', d: 'M-50-8C-35-24-15-24 0-8C15 8 35 8 50-8V12C35 28 15 28 0 12C-15-4-35-4-50 12Z' },
  montanha: { nome: 'Montanha', d: 'M-50 40L-18-24L0 4L18-36L50 40Z' },
  escudo_meio: { nome: 'Meio escudo', d: 'M0-50H42V-6C42 20 24 38 0 50Z' },
  coroa_real: {
    nome: 'Coroa real',
    d: [
      'M-36 30H36V44H-36Z',
      'M-36 30L-42-8L-24 8L-12-14L0 4L12-14L24 8L42-8L36 30Z',
      'M-42-14A6 6 0 1 1-42-2A6 6 0 1 1-42-14Z',
      'M-12-20A6 6 0 1 1-12-8A6 6 0 1 1-12-20Z',
      'M12-20A6 6 0 1 1 12-8A6 6 0 1 1 12-20Z',
      'M42-14A6 6 0 1 1 42-2A6 6 0 1 1 42-14Z',
      'M-24-2C-20-34 20-34 24-2H18C14-26-14-26-18-2Z',
      'M0-40A6 6 0 1 1 0-28A6 6 0 1 1 0-40Z',
      'M-2.5-50H2.5V-38H-2.5Z',
      'M-7-47H7V-43H-7Z',
    ],
  },
  ramo: {
    nome: 'Ramo de louro',
    d: [
      'M6.7 47.6L3.1 43.3L-0.1 38.8L-3 34.2L-5.4 29.4L-7.5 24.4L-9.2 19.4L-10.5 14.3L-11.3 9.2L-11.8 4L-12 -1.2L-11.7 -6.3L-11 -11.4L-9.9 -16.4L-8.5 -21.3L-6.6 -26.1L-4.3 -30.7L-1.7 -35.2L1.4 -39.4L4.8 -43.5L8.7 -47.2L7.3 -48.8L3.2 -45L-0.6 -41L-4 -36.8L-7 -32.2L-9.6 -27.5L-11.8 -22.5L-13.6 -17.4L-15 -12.2L-16 -6.8L-16.5 -1.3L-16.7 4.2L-16.4 9.7L-15.7 15.3L-14.6 20.9L-13.1 26.4L-11.1 31.8L-8.7 37.2L-5.8 42.4L-2.5 47.5L1.3 52.4Z',
      'M-6.3 34.7Q1.5 29.1 -0.6 19.7Q-8.4 25.3 -6.3 34.7Z',
      'M-10.6 24.4Q-15.7 16.6 -24.8 18.2Q-19.8 25.9 -10.6 24.4Z',
      'M-13.3 13.7Q-4.8 11 -4.1 2.1Q-12.6 4.8 -13.3 13.7Z',
      'M-14.3 3Q-16.5 -5.3 -25.1 -6.3Q-22.8 2 -14.3 3Z',
      'M-13.7 -7.6Q-5.4 -7.6 -2.4 -15.3Q-10.7 -15.3 -13.7 -7.6Z',
      'M-11.5 -17.9Q-11 -25.8 -18.2 -29.1Q-18.7 -21.1 -11.5 -17.9Z',
      'M-7.6 -27.7Q-0.5 -25.3 4.3 -31.2Q-2.9 -33.6 -7.6 -27.7Z',
      'M-2.2 -36.8Q0.6 -43.5 -4.8 -48.4Q-7.6 -41.7 -2.2 -36.8Z',
      'M8 -48Q14 -46 18 -52Q12 -54 8 -48Z',
    ],
  },
  flor_de_lis: {
    nome: 'Flor-de-lis',
    d: [
      'M0-50C10-36 12-18 6 2H-6C-12-18-10-36 0-50Z',
      'M4 8C10-24 40-36 48-10C50 0 44 10 36 8C42 0 40-14 30-14C20-14 14 0 12 12Z',
      'M-4 8C-10-24-40-36-48-10C-50 0-44 10-36 8C-42 0-40-14-30-14C-20-14-14 0-12 12Z',
      'M-26 6H26V15H-26Z',
      'M-6 15H6L10 34C6 42 0 46 0 50C0 46-6 42-10 34Z',
    ],
  },
  aguia: {
    nome: 'Águia',
    d: [
      'M0-22C10-22 12-8 10 10C8 22 4 28 0 30C-4 28-8 22-10 10C-12-8-10-22 0-22Z',
      'M0-40A9 9 0 1 1 0-22A9 9 0 1 1 0-40Z',
      'M7-34L18-30L7-26Z',
      'M8-14C20-30 34-44 48-46L42-36L50-32L42-26L48-20L38-18L42-10L30-10C22-8 14-4 10 2Z',
      'M-8-14C-20-30-34-44-48-46L-42-36L-50-32L-42-26L-48-20L-38-18L-42-10L-30-10C-22-8-14-4-10 2Z',
      'M-8 24L-18 46L-6 40L0 50L6 40L18 46L8 24Z',
      'M-9 12L-22 26L-17 29L-6 20Z',
      'M9 12L22 26L17 29L6 20Z',
    ],
  },
  morcego: {
    nome: 'Morcego',
    d: [
      'M-8-6C-8-14-6-18-7-28L-2-18H2L7-28C6-18 8-14 8-6C8 6 4 14 0 18C-4 14-8 6-8-6Z',
      'M6-10C16-18 30-26 50-20C46-12 44-6 46 0C40-4 36-4 32 4C28-2 24-2 20 8C16 2 12 2 8 8Z',
      'M-6-10C-16-18-30-26-50-20C-46-12-44-6-46 0C-40-4-36-4-32 4C-28-2-24-2-20 8C-16 2-12 2-8 8Z',
    ],
  },
  chave: {
    nome: 'Chave',
    d: [
      'M0-50A16 16 0 1 1 0-18A16 16 0 1 1 0-50ZM0-41A7 7 0 1 0 0-27A7 7 0 1 0 0-41Z',
      'M-4-19H4V50H-4Z',
      'M4 30H18V38H4Z',
      'M4 42H14V50H4Z',
    ],
    furos: true,
  },
  ancora: {
    nome: 'Âncora',
    d: [
      'M0-50A8 8 0 1 1 0-34A8 8 0 1 1 0-50ZM0-46A4 4 0 1 0 0-38A4 4 0 1 0 0-46Z',
      'M-22-30H22V-23H-22Z',
      'M-4-35H4V46H-4Z',
      'M-40 14C-36 40-12 50 0 50C12 50 36 40 40 14L33 20C30 36 12 42 0 42C-12 42-30 36-33 20Z',
      'M-48 24L-40 8L-32 24Z',
      'M48 24L40 8L32 24Z',
    ],
    furos: true,
  },
  fita: {
    nome: 'Fita',
    d: [
      'M-36-14H36V6H-36Z',
      'M-36-6H-50L-42 4L-50 14H-30V6H-36Z',
      'M36-6H50L42 4L50 14H30V6H36Z',
    ],
  },
};

/** As partes de uma forma (uma só, para as formas de um caminho). */
export function partesDaForma(forma: FormaEmblema): readonly string[] {
  const d = FORMAS[forma].d;
  return typeof d === 'string' ? [d] : d;
}

/** `transform` SVG da camada no quadro de 0 a 100 do emblema. */
export function transformacaoDaCamada(c: CamadaEmblema): string {
  const sx = c.escala * c.largura;
  return `translate(${c.x} ${c.y}) rotate(${c.rotacao}) scale(${c.espelhar ? -sx : sx} ${c.escala * c.altura})`;
}

const camada = (forma: FormaEmblema, cor: string, x = 50, y = 50, escala = 1, rotacao = 0, espelhar = false): CamadaEmblema => ({
  forma,
  x,
  y,
  escala,
  largura: 1,
  altura: 1,
  rotacao,
  cor,
  espelhar,
});

/** Estica uma camada (largura e altura multiplicam o tamanho). */
const esticada = (c: CamadaEmblema, largura: number, altura: number): CamadaEmblema => ({ ...c, largura, altura });

const VERDE = '#4f6b3a';
const OURO = '#d4a64a';
const PRETO = '#1c1410';
const BRANCO = '#f5f5f5';
const PERGAMINHO = '#f1e6cf';

/** Par de ramos de louro abraçando o brasão (o da direita espelhado). */
const louros = (cor = VERDE, y = 60, escala = 0.62): CamadaEmblema[] => [
  camada('ramo', cor, 24, y, escala, 350),
  camada('ramo', cor, 76, y, escala, 10, true),
];

/** Escudo com borda: a borda é o mesmo escudo, um pouco maior, atrás. */
const escudoComBorda = (cor: string, borda: string, y = 54, escala = 0.8): CamadaEmblema[] => [
  camada('escudo', borda, 50, y, Math.round((escala + 0.06) * 1000) / 1000),
  camada('escudo', cor, 50, y, escala),
];

/** Emblemas prontos, para começar (e para mostrar o que dá para montar). Os brasões vêm primeiro. */
export const EMBLEMAS_PRONTOS: { nome: string; camadas: CamadaEmblema[] }[] = [
  {
    nome: 'Morcego coroado',
    camadas: [
      ...louros(VERDE, 64),
      camada('quadrado', PERGAMINHO, 50, 64, 0.46, 45),
      camada('quadrado', '#f1c40f', 50, 64, 0.4, 45),
      // Quatro faixas vermelhas em pé, cada uma do comprimento que cabe no losango naquela altura.
      esticada(camada('barra', '#e74c3c', 36, 64, 0.23, 90), 1.03, 1),
      esticada(camada('barra', '#e74c3c', 45.5, 64, 0.23, 90), 1.85, 1),
      esticada(camada('barra', '#e74c3c', 54.5, 64, 0.23, 90), 1.85, 1),
      esticada(camada('barra', '#e74c3c', 64, 64, 0.23, 90), 1.03, 1),
      camada('coroa_real', OURO, 50, 33, 0.3),
      camada('morcego', PRETO, 50, 13, 0.34),
    ],
  },
  {
    nome: 'Império',
    camadas: [
      ...louros('#2ecc71', 60),
      ...escudoComBorda(VERDE, OURO, 58, 0.46),
      camada('anel', '#3f51b5', 50, 56, 0.3),
      camada('cruz_pata', '#e74c3c', 50, 56, 0.2),
      camada('anel', OURO, 50, 56, 0.15),
      esticada(camada('barra', OURO, 50, 56, 0.15, 335), 1, 0.6),
      camada('semicirculo', '#e74c3c', 50, 24, 0.17),
      camada('coroa_real', OURO, 50, 22, 0.3),
    ],
  },
  {
    nome: 'Águia imperial',
    camadas: [...escudoComBorda(OURO, PRETO, 56, 0.78), camada('aguia', PRETO, 50, 58, 0.6), camada('coroa_real', '#7a2e1f', 50, 26, 0.16)],
  },
  {
    nome: 'Flor-de-lis',
    camadas: [
      ...escudoComBorda('#3f51b5', OURO),
      camada('flor_de_lis', OURO, 34, 36, 0.24),
      camada('flor_de_lis', OURO, 66, 36, 0.24),
      camada('flor_de_lis', OURO, 50, 66, 0.24),
    ],
  },
  {
    nome: 'Chaves cruzadas',
    camadas: [
      ...escudoComBorda('#7a2e1f', OURO, 60, 0.7),
      camada('chave', OURO, 50, 60, 0.5, 35),
      camada('chave', BRANCO, 50, 60, 0.5, 325, true),
      camada('coroa_real', OURO, 50, 16, 0.26),
    ],
  },
  {
    nome: 'Âncora e louros',
    camadas: [...louros(VERDE, 54), camada('ancora', PERGAMINHO, 50, 46, 0.56), esticada(camada('fita', '#7a2e1f', 50, 87, 0.5), 1, 0.8)],
  },
  {
    nome: 'Três torres',
    camadas: [
      ...escudoComBorda('#e74c3c', OURO),
      camada('torre', OURO, 34, 36, 0.24),
      camada('torre', OURO, 66, 36, 0.24),
      camada('torre', OURO, 50, 66, 0.24),
    ],
  },
  {
    nome: 'Sol e lua',
    camadas: [
      ...escudoComBorda('#3f51b5', OURO),
      camada('escudo_meio', '#f1c40f', 50, 54, 0.8),
      camada('sol', '#f1c40f', 32, 44, 0.24),
      camada('meia_lua', '#3f51b5', 69, 44, 0.2, 200),
    ],
  },
  {
    nome: 'Cruz templária',
    camadas: [...escudoComBorda(BRANCO, PRETO), camada('cruz_pata', '#e74c3c', 50, 48, 0.52)],
  },
  {
    nome: 'Banda estrelada',
    camadas: [
      ...escudoComBorda('#3f51b5', OURO),
      esticada(camada('barra', PERGAMINHO, 50, 50, 0.62, 45), 1, 1.1),
      camada('estrela', OURO, 68, 30, 0.2),
      camada('estrela', OURO, 33, 68, 0.2),
    ],
  },
  {
    nome: 'Espadas e louros',
    camadas: [
      ...louros(VERDE, 60),
      camada('espada', PERGAMINHO, 50, 56, 0.66, 35),
      camada('espada', PERGAMINHO, 50, 56, 0.66, 325),
      camada('coroa_real', OURO, 50, 14, 0.26),
    ],
  },
  {
    nome: 'Rosa dos ventos',
    camadas: [
      camada('anel', OURO, 50, 50, 0.72),
      camada('estrela4', PERGAMINHO, 50, 50, 0.9),
      camada('estrela4', OURO, 50, 50, 0.56, 45),
      camada('circulo', '#7a2e1f', 50, 50, 0.1),
    ],
  },
  {
    nome: 'Espada e escudo',
    camadas: [
      camada('escudo', '#1c1410', 50, 52, 0.82),
      camada('escudo', '#d4a64a', 50, 52, 0.7),
      camada('espada', '#f1e6cf', 50, 50, 0.78, 45),
      camada('espada', '#f1e6cf', 50, 50, 0.78, 315),
    ],
  },
  {
    nome: 'Sol nascente',
    camadas: [camada('sol', '#f39c12', 50, 48, 0.86), camada('circulo', '#f1c40f', 50, 48, 0.5), camada('onda', '#3498db', 50, 82, 0.9)],
  },
  {
    nome: 'Lua e estrela',
    camadas: [camada('meia_lua', '#f1e6cf', 44, 50, 0.84, 10), camada('estrela', '#d4a64a', 70, 44, 0.32, 10)],
  },
  {
    nome: 'Coroa',
    camadas: [camada('coroa', '#d4a64a', 50, 50, 0.84), camada('losango', '#e74c3c', 50, 50, 0.16), camada('circulo', '#3498db', 28, 34, 0.08), camada('circulo', '#3498db', 72, 34, 0.08)],
  },
  {
    nome: 'Fera',
    camadas: [camada('garras', '#e74c3c', 50, 50, 0.86, 18), camada('olho', '#f1c40f', 50, 18, 0.34)],
  },
  {
    nome: 'Torre em chamas',
    camadas: [camada('chama', '#f39c12', 50, 34, 0.56), camada('chama', '#f1c40f', 50, 38, 0.34), camada('torre', '#1c1410', 50, 64, 0.58)],
  },
  {
    nome: 'Asas',
    camadas: [camada('asa', '#f5f5f5', 30, 48, 0.6, 0, true), camada('asa', '#f5f5f5', 70, 48, 0.6), camada('estrela4', '#d4a64a', 50, 50, 0.3)],
  },
  {
    nome: 'Montanha',
    camadas: [camada('circulo', '#f1e6cf', 64, 32, 0.22), camada('montanha', '#4f6b3a', 50, 58, 0.9), camada('montanha', '#f5f5f5', 54, 26, 0.24)],
  },
];
