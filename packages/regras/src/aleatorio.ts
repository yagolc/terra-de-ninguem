// Aleatoriedade com semente: a mesma semente sempre gera a mesma sequência, então uma batalha
// pode ser refeita para o relatório ou para um teste. As regras nunca chamam Math.random direto.

/** Gerador mulberry32: devolve uma função que produz números em [0, 1). */
export function geradorComSemente(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Transforma um texto (ex.: o id da marcha) numa semente de 32 bits (hash FNV-1a). */
export function sementeDeTexto(texto: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Sorte da batalha em [-1, 1]; `resolverBatalha` converte em ±10% de força. */
export function sortearSorte(gerador: () => number): number {
  return gerador() * 2 - 1;
}
