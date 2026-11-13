// Gera os ícones do app (PWA) em public/ a partir do escudo do jogo. Rode só quando mudar o desenho.
// Precisa do sharp, que não é dependência do projeto: copie este arquivo para uma pasta temporária, rode ali
// `npm install sharp` e depois `node gerar-icones.mjs <caminho do projeto>/apps/web/public`.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const destino = process.argv[2];
if (!destino) throw new Error('Passe a pasta public do site.');

const escudo = `
  <path d="M32 4 8 12v18c0 15 10 25 24 30 14-5 24-15 24-30V12L32 4Z" fill="#7a2e1f" stroke="#d4a64a" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 16v32M20 28h24" stroke="#d4a64a" stroke-width="4" stroke-linecap="round"/>`;

// Fundo da cor do jogo (noite com o brilho de couro no alto, como o site) e o escudo no meio.
function svg({ escala, cantos }) {
  const deslocamento = 256 - 32 * escala;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="fundo" cx="50%" cy="0%" r="100%">
      <stop offset="0%" stop-color="#3b2c22"/>
      <stop offset="70%" stop-color="#1c1410"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" rx="${cantos}" fill="url(#fundo)"/>
  <g transform="translate(${deslocamento} ${deslocamento}) scale(${escala})">${escudo}</g>
</svg>`;
}

// "any": cantos arredondados e escudo grande. Máscara (Android recorta em círculo ou gota): fundo inteiro e
// escudo dentro do círculo seguro de 80%. Apple: fundo inteiro (o iOS arredonda sozinho).
const fontes = {
  'icone-app.svg': svg({ escala: 6, cantos: 96 }),
  mascaravel: svg({ escala: 4.2, cantos: 0 }),
  apple: svg({ escala: 5, cantos: 0 }),
};
fs.writeFileSync(path.join(destino, 'icone-app.svg'), fontes['icone-app.svg']);

const saidas = [
  ['icone-192.png', fontes['icone-app.svg'], 192],
  ['icone-512.png', fontes['icone-app.svg'], 512],
  ['icone-mascaravel-512.png', fontes.mascaravel, 512],
  ['apple-touch-icon.png', fontes.apple, 180],
];
for (const [nome, fonte, tamanho] of saidas) {
  await sharp(Buffer.from(fonte)).resize(tamanho, tamanho).png({ compressionLevel: 9 }).toFile(path.join(destino, nome));
  console.log(nome, fs.statSync(path.join(destino, nome)).size);
}
