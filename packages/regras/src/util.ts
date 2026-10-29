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

export function somarExercitos(...exercitos: Exercito[]): Exercito {
  return mapearExercito((tipo) => exercitos.reduce((soma, e) => soma + e[tipo], 0));
}

/**
 * Divide perdas totais entre vários grupos de tropas (ex.: territórios), na proporção do que cada um
 * tem de cada tipo. O maior resto fecha a conta em números inteiros, e nenhum grupo perde mais do que
 * tem. Devolve as perdas de cada grupo, na mesma ordem.
 */
export function distribuirPerdas(grupos: readonly Exercito[], perdas: Exercito): Exercito[] {
  const resultado = grupos.map(() => exercito());
  for (const tipo of TIPOS_UNIDADE) {
    const total = grupos.reduce((soma, g) => soma + g[tipo], 0);
    const aPerder = Math.min(perdas[tipo], total);
    if (aPerder <= 0) continue;
    const exatas = grupos.map((g) => (g[tipo] / total) * aPerder);
    grupos.forEach((_, i) => (resultado[i]![tipo] = Math.floor(exatas[i]!)));
    let falta = aPerder - resultado.reduce((soma, r) => soma + r[tipo], 0);
    const porResto = grupos.map((_, i) => i).sort((a, b) => (exatas[b]! % 1) - (exatas[a]! % 1) || a - b);
    for (const i of porResto) {
      if (falta === 0) break;
      if (resultado[i]![tipo] < grupos[i]![tipo]) {
        resultado[i]![tipo]++;
        falta--;
      }
    }
  }
  return resultado;
}
