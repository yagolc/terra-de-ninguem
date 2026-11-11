// A bandeira completa (cor, padrão e emblema) como texto SVG, para virar imagem fora do React (o mapa, em Phaser).
// Mesmo desenho do componente `Bandeira`.
import type { Bandeira } from '@terra/regras';
import { formasDoPadrao } from './bandeira';
import { FORMAS, partesDaForma, transformacaoDaCamada } from './formasEmblema';

/** Quadro da bandeira (3 × 2) e lado do quadro do emblema no centro, iguais aos do componente `Bandeira`. */
export const L_BANDEIRA = 30;
export const A_BANDEIRA = 20;
const E = 17;

/** SVG da bandeira com `largura` × 2/3 pixels (desenhe maior que o tamanho na tela para ficar nítida no zoom). */
export function svgDaBandeira(bandeira: Bandeira, largura: number): string {
  const altura = Math.round((largura * A_BANDEIRA) / L_BANDEIRA);
  const padrao = formasDoPadrao(bandeira.padrao)
    .map((forma) => `<polygon points="${forma.map((v, j) => (j % 2 === 0 ? v * L_BANDEIRA : v * A_BANDEIRA)).join(' ')}" fill="${bandeira.corSecundaria}"/>`)
    .join('');
  const emblema = bandeira.emblema
    .map((c) => {
      const partes = partesDaForma(c.forma)
        .map((d) => `<path d="${d}"/>`)
        .join('');
      const regra = FORMAS[c.forma].furos ? 'evenodd' : 'nonzero';
      return `<g fill="${c.cor}" fill-rule="${regra}" transform="${transformacaoDaCamada(c)}">${partes}</g>`;
    })
    .join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L_BANDEIRA} ${A_BANDEIRA}" width="${largura}" height="${altura}">` +
    `<rect width="${L_BANDEIRA}" height="${A_BANDEIRA}" fill="${bandeira.cor}"/>` +
    padrao +
    (emblema ? `<g transform="translate(${(L_BANDEIRA - E) / 2} ${(A_BANDEIRA - E) / 2}) scale(${E / 100})">${emblema}</g>` : '') +
    `<rect x="0.5" y="0.5" width="${L_BANDEIRA - 1}" height="${A_BANDEIRA - 1}" fill="none" stroke="#f1e6cf" stroke-opacity="0.8"/>` +
    '</svg>'
  );
}

/** Chave curta e estável para a mesma bandeira (para guardar a imagem uma vez só). */
export function chaveDaBandeira(bandeira: Bandeira): string {
  const texto = JSON.stringify(bandeira);
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h * 33) ^ texto.charCodeAt(i)) >>> 0;
  return `bandeira-${h.toString(36)}-${texto.length}`;
}
