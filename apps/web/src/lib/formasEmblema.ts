// Desenho das formas do emblema: caminhos SVG num quadro de -50 a 50 (a forma no tamanho 1 ocupa o emblema todo).
import type { CamadaEmblema, FormaEmblema } from '@terra/regras';

type Forma = { nome: string; d: string; /** Furos (anel, olho): regra par-ímpar. */ furos?: boolean };

export const FORMAS: Record<FormaEmblema, Forma> = {
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
};

/** `transform` SVG da camada no quadro de 0 a 100 do emblema. */
export function transformacaoDaCamada(c: CamadaEmblema): string {
  return `translate(${c.x} ${c.y}) rotate(${c.rotacao}) scale(${c.espelhar ? -c.escala : c.escala} ${c.escala})`;
}

const camada = (forma: FormaEmblema, cor: string, x = 50, y = 50, escala = 1, rotacao = 0, espelhar = false): CamadaEmblema => ({
  forma,
  x,
  y,
  escala,
  rotacao,
  cor,
  espelhar,
});

/** Emblemas prontos, para começar (e para mostrar o que dá para montar). */
export const EMBLEMAS_PRONTOS: { nome: string; camadas: CamadaEmblema[] }[] = [
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
