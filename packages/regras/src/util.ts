import { RECURSOS, TIPOS_UNIDADE, type Exercito, type Recurso, type Recursos, type TipoUnidade } from './tipos.ts';

export const HORA_MS = 60 * 60 * 1000;
export const MINUTO_MS = 60 * 1000;

export function recursos(valores: Partial<Recursos> = {}): Recursos {
  return { comida: valores.comida ?? 0, madeira: valores.madeira ?? 0, ouro: valores.ouro ?? 0 };
}

export function mapearRecursos(fn: (recurso: Recurso) => number): Recursos {
  return { comida: fn('comida'), madeira: fn('madeira'), ouro: fn('ouro') };
}

export function temRecursos(estoque: Recursos, custo: Recursos): boolean {
  return RECURSOS.every((r) => estoque[r] >= custo[r]);
}

export function subtrairRecursos(a: Recursos, b: Recursos): Recursos {
  return mapearRecursos((r) => a[r] - b[r]);
}

export function totalRecursos(r: Recursos): number {
  return r.comida + r.madeira + r.ouro;
}

export function exercito(valores: Partial<Exercito> = {}): Exercito {
  return { lanceiro: valores.lanceiro ?? 0, arqueiro: valores.arqueiro ?? 0, cavalaria: valores.cavalaria ?? 0 };
}

export function mapearExercito(fn: (tipo: TipoUnidade) => number): Exercito {
  return { lanceiro: fn('lanceiro'), arqueiro: fn('arqueiro'), cavalaria: fn('cavalaria') };
}

export function totalUnidades(e: Exercito): number {
  return TIPOS_UNIDADE.reduce((soma, tipo) => soma + e[tipo], 0);
}
