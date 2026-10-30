// Funções sobre o grafo de territórios (quem é vizinho de quem). Genéricas no tipo do id:
// o gerador usa índices; o servidor usa os uuids do banco.
import { BALANCEAMENTO } from './balanceamento.ts';
import type { Recurso, Recursos, Terreno } from './tipos.ts';
import { recursos } from './util.ts';

/** Recurso que cada terreno bonifica. */
export const BONUS_DO_TERRENO: Record<Terreno, Recurso> = {
  planicie: 'comida',
  floresta: 'madeira',
  montanha: 'ouro',
};

/** Soma o bônus de produção dos territórios de um jogador (um item por território). */
export function bonusDeTerritorios(bonusDeCada: Recurso[]): Recursos {
  const total = recursos();
  for (const r of bonusDeCada) total[r] += BALANCEAMENTO.mapa.bonusTerritorio;
  return total;
}

export function grafoDeFronteiras<Id>(fronteiras: readonly (readonly [Id, Id])[]): Map<Id, Id[]> {
  const grafo = new Map<Id, Id[]>();
  for (const [a, b] of fronteiras) {
    grafo.set(a, [...(grafo.get(a) ?? []), b]);
    grafo.set(b, [...(grafo.get(b) ?? []), a]);
  }
  return grafo;
}

/** Distância em número de fronteiras de qualquer origem até cada território alcançável. */
export function distanciasNoGrafo<Id>(grafo: Map<Id, Id[]>, origens: Iterable<Id>): Map<Id, number> {
  const distancia = new Map<Id, number>();
  let fila: Id[] = [];
  for (const o of origens) {
    distancia.set(o, 0);
    fila.push(o);
  }
  while (fila.length > 0) {
    const proxima: Id[] = [];
    for (const atual of fila) {
      for (const vizinho of grafo.get(atual) ?? []) {
        if (distancia.has(vizinho)) continue;
        distancia.set(vizinho, distancia.get(atual)! + 1);
        proxima.push(vizinho);
      }
    }
    fila = proxima;
  }
  return distancia;
}

/**
 * Território para quem entra com a temporada já começada: entre os livres (sem dono e sem reserva),
 * o mais distante de qualquer território ocupado ou reservado. `null` se não sobrar nenhum.
 */
export function escolherTerritorioLivre<Id>(entrada: {
  todos: readonly Id[];
  grafo: Map<Id, Id[]>;
  ocupadosOuReservados: ReadonlySet<Id>;
}): Id | null {
  const { todos, grafo, ocupadosOuReservados } = entrada;
  const livres = todos.filter((id) => !ocupadosOuReservados.has(id));
  if (livres.length === 0) return null;
  if (ocupadosOuReservados.size === 0) return livres[0] as Id;

  const distancia = distanciasNoGrafo(grafo, ocupadosOuReservados);
  let melhor = livres[0] as Id;
  for (const id of livres) {
    if ((distancia.get(id) ?? Infinity) > (distancia.get(melhor) ?? Infinity)) melhor = id;
  }
  return melhor;
}

/**
 * A origem chega ao destino andando só por territórios do jogador (sem atravessar terra alheia)?
 * Usado para mover tropas entre territórios próprios.
 */
export function ligadosPorTerritoriosProprios<Id>(entrada: {
  grafo: Map<Id, Id[]>;
  origem: Id;
  destino: Id;
  proprios: ReadonlySet<Id>;
}): boolean {
  const { grafo, origem, destino, proprios } = entrada;
  if (!proprios.has(origem) || !proprios.has(destino)) return false;
  const visitados = new Set<Id>([origem]);
  const fila = [origem];
  while (fila.length > 0) {
    const atual = fila.pop()!;
    if (atual === destino) return true;
    for (const vizinho of grafo.get(atual) ?? []) {
      if (proprios.has(vizinho) && !visitados.has(vizinho)) {
        visitados.add(vizinho);
        fila.push(vizinho);
      }
    }
  }
  return false;
}

/** Cores dos jogadores no mapa: bem diferentes entre si e do marrom dos territórios neutros. */
export const CORES_JOGADORES = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e84393', '#f1c40f'] as const;

/** Primeira cor da paleta que nenhum outro jogador da temporada usa (se todas estiverem em uso, repete). */
export function escolherCor(usadas: readonly (string | null)[]): string {
  const ocupadas = new Set(usadas.filter((c): c is string => !!c).map((c) => c.toLowerCase()));
  return CORES_JOGADORES.find((c) => !ocupadas.has(c)) ?? CORES_JOGADORES[ocupadas.size % CORES_JOGADORES.length]!;
}
