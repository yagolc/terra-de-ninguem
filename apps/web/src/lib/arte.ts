import type { TipoPredio, TipoUnidade } from '@terra/regras';

// Imagens geradas para o jogo (WebP em src/assets/arte, criadas por `npm run arte` a partir de docs/arte/originais).
// O Vite só inclui as que existem; o que faltar continua com o emoji.
const ARTE = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../assets/arte/*.webp', { eager: true, query: '?url', import: 'default' })).map(
    ([caminho, url]) => [caminho.slice(caminho.lastIndexOf('/') + 1, -'.webp'.length), url],
  ),
);

/** Fase da imagem do prédio: 1 nos níveis 0–3, 2 nos 4–7, 3 nos 8–10. */
export function faseDoPredio(nivel: number): 1 | 2 | 3 {
  return nivel >= 8 ? 3 : nivel >= 4 ? 2 : 1;
}

/** Imagem do prédio no nível dado; sem a da fase, usa a fase anterior que existir. */
export function imagemDoPredio(tipo: TipoPredio, nivel: number): string | null {
  for (let fase = faseDoPredio(nivel); fase >= 1; fase--) {
    const url = ARTE[`${tipo}-${fase}`];
    if (url) return url;
  }
  return null;
}

/** Cena de treino da unidade no quartel (treino-<tipo>), se já existir. */
export function imagemDoTreino(tipo: TipoUnidade): string | null {
  return ARTE[`treino-${tipo}`] ?? null;
}
