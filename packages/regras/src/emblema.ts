// Emblema do jogador: até 12 camadas de formas geométricas (posição, tamanho, rotação, cor), empilhadas na ordem
// da lista (a primeira fica no fundo). O desenho de cada forma fica no site; aqui só os nomes e os limites.
import { CORES_JOGADORES } from './territorios.ts';

export const FORMAS_EMBLEMA = [
  'circulo',
  'anel',
  'semicirculo',
  'arco',
  'meia_lua',
  'quadrado',
  'barra',
  'losango',
  'triangulo',
  'canto',
  'pentagono',
  'hexagono',
  'estrela',
  'estrela4',
  'sol',
  'chevron',
  'seta',
  'cruz',
  'cruz_pata',
  'escudo',
  'coroa',
  'torre',
  'espada',
  'lamina',
  'garras',
  'raio',
  'chama',
  'gota',
  'folha',
  'asa',
  'coracao',
  'olho',
  'onda',
  'montanha',
] as const;
export type FormaEmblema = (typeof FORMAS_EMBLEMA)[number];

/** Cores das camadas: a paleta dos jogadores, mais preto, pergaminho, ouro, sangue, musgo e cinza. */
export const CORES_EMBLEMA: readonly string[] = [
  ...CORES_JOGADORES,
  '#1c1410',
  '#f1e6cf',
  '#d4a64a',
  '#7a2e1f',
  '#4f6b3a',
  '#8a8a8a',
];

/**
 * O emblema ocupa um quadro de 100 × 100; cada forma, no tamanho 1, preenche o quadro inteiro. `x` e `y` são o
 * centro da forma no quadro; `rotacao` em graus; `espelhar` vira na horizontal.
 */
export type CamadaEmblema = {
  forma: FormaEmblema;
  x: number;
  y: number;
  escala: number;
  rotacao: number;
  cor: string;
  espelhar: boolean;
};

export const LIMITES_EMBLEMA = { camadas: 12, escalaMinima: 0.05, escalaMaxima: 1.5 } as const;

export type MotivoRecusaEmblema = 'emblema_invalido' | 'camadas_demais';

const arredondar = (v: number, casas: number) => Math.round(v * 10 ** casas) / 10 ** casas;
const numero = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Confere e normaliza o emblema vindo do jogador (ou lido do banco). */
export function verificarEmblema(
  valor: unknown,
): { ok: true; emblema: CamadaEmblema[] } | { ok: false; motivo: MotivoRecusaEmblema } {
  if (valor === undefined || valor === null) return { ok: true, emblema: [] };
  if (!Array.isArray(valor)) return { ok: false, motivo: 'emblema_invalido' };
  if (valor.length > LIMITES_EMBLEMA.camadas) return { ok: false, motivo: 'camadas_demais' };

  const emblema: CamadaEmblema[] = [];
  for (const item of valor as unknown[]) {
    if (typeof item !== 'object' || item === null) return { ok: false, motivo: 'emblema_invalido' };
    const c = item as Record<string, unknown>;
    const forma = FORMAS_EMBLEMA.find((f) => f === c.forma);
    const x = numero(c.x);
    const y = numero(c.y);
    const escala = numero(c.escala);
    const rotacao = numero(c.rotacao);
    const cor = typeof c.cor === 'string' ? c.cor.toLowerCase() : '';
    if (!forma || x === null || y === null || escala === null || rotacao === null) return { ok: false, motivo: 'emblema_invalido' };
    if (x < 0 || x > 100 || y < 0 || y > 100) return { ok: false, motivo: 'emblema_invalido' };
    if (escala < LIMITES_EMBLEMA.escalaMinima || escala > LIMITES_EMBLEMA.escalaMaxima) return { ok: false, motivo: 'emblema_invalido' };
    if (!CORES_EMBLEMA.includes(cor)) return { ok: false, motivo: 'emblema_invalido' };
    if (c.espelhar !== undefined && typeof c.espelhar !== 'boolean') return { ok: false, motivo: 'emblema_invalido' };
    emblema.push({
      forma,
      x: arredondar(x, 1),
      y: arredondar(y, 1),
      escala: arredondar(escala, 3),
      rotacao: ((Math.round(rotacao) % 360) + 360) % 360,
      cor,
      espelhar: c.espelhar === true,
    });
  }
  return { ok: true, emblema };
}
