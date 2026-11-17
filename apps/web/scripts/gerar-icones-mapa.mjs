// Gera src/mapa/iconesMapa.ts: os contornos (caminhos SVG) dos ícones desenhados no mapa, a partir da mesma tabela
// emoji → ícone de src/lib/icones.ts (game-icons.net via react-icons). Assim o mapa (Phaser) não carrega o React nem
// a coleção inteira, só os caminhos de que precisa. Rode na raiz do repositório quando mudar a tabela ou a lista:
//   node apps/web/scripts/gerar-icones-mapa.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as gi from 'react-icons/gi';

const web = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tabela = fs.readFileSync(path.join(web, 'src/lib/icones.ts'), 'utf8');
const nomeDo = new Map([...tabela.matchAll(/^\s*'([^']+)':\s*(Gi\w+),/gmu)].map((m) => [m[1], m[2]]));

// Emojis que o mapa desenha (sem o seletor de variação).
const DO_MAPA = ['🏰', '👑', '☠', '💤', '🌲', '⛰', '🗼', '🪵', '🏪', '⛺', '❓', '🎖', '⚖', '🏘', '🔒', '🐺', '🐦‍⬛', '🐈', '🐻', '🦅', '🐉'];

const saida = {};
for (const emoji of DO_MAPA) {
  const nome = nomeDo.get(emoji);
  if (!nome || !gi[nome]) throw new Error(`Sem ícone para ${emoji} na tabela de lib/icones.ts`);
  const svg = renderToStaticMarkup(createElement(gi[nome]));
  const caminhos = [...svg.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]);
  if (caminhos.length === 0) throw new Error(`Ícone ${nome} sem caminho`);
  saida[emoji] = caminhos;
}

const arquivo = `// GERADO por apps/web/scripts/gerar-icones-mapa.mjs: não edite à mão.
// Caminhos SVG (quadro de 512) dos ícones desenhados no mapa, de game-icons.net (CC BY 3.0), por emoji.
export const CAMINHOS_ICONES_MAPA: Record<string, readonly string[]> = ${JSON.stringify(saida, null, 1)};
`;
fs.writeFileSync(path.join(web, 'src/mapa/iconesMapa.ts'), arquivo);
console.log('ok:', Object.keys(saida).length, 'ícones,', Math.round(arquivo.length / 1024), 'KB');
