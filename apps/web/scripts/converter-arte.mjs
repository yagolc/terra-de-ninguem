// Converte as imagens geradas (docs/arte/originais, PNG ou JPG) em WebP de 512 px para o site
// (apps/web/src/assets/arte). Só refaz as que mudaram. Precisa do ffmpeg instalado.
// Uso: npm run arte
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../../../', import.meta.url));
const origem = join(raiz, 'docs/arte/originais');
const destino = join(raiz, 'apps/web/src/assets/arte');
mkdirSync(destino, { recursive: true });

let convertidas = 0;
for (const arquivo of readdirSync(origem)) {
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(extname(arquivo).toLowerCase())) continue;
  const entrada = join(origem, arquivo);
  const saida = join(destino, `${basename(arquivo, extname(arquivo)).toLowerCase()}.webp`);
  if (existsSync(saida) && statSync(saida).mtimeMs >= statSync(entrada).mtimeMs) continue;
  const r = spawnSync(
    'ffmpeg',
    ['-v', 'error', '-y', '-i', entrada, '-vf', 'scale=512:512:flags=lanczos', '-c:v', 'libwebp', '-quality', '80', saida],
    { stdio: 'inherit' },
  );
  if (r.error || r.status !== 0) {
    console.error(`Falhou: ${arquivo}${r.error ? ` (${r.error.message}; o ffmpeg está instalado?)` : ''}`);
    process.exitCode = 1;
    continue;
  }
  convertidas++;
  console.log(`${arquivo} → ${basename(saida)} (${Math.round(statSync(saida).size / 1024)} KB)`);
}
console.log(convertidas ? `${convertidas} imagem(ns) convertida(s).` : 'Nada novo para converter.');
