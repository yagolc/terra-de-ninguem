// Desenho da bandeira do jogador: textos e formas dos padrões, usados pelo componente `Bandeira` (SVG) e pelo mapa (Phaser).
import { BANDEIRA_INICIAL, TITULOS_LOJA, verificarEmblema, type Bandeira, type PadraoBandeira } from '@terra/regras';
import { corDoJogador } from './useMapa';

export const PADROES_INFO: Record<PadraoBandeira, string> = {
  lisa: 'Lisa',
  faixa: 'Faixa',
  dividida: 'Dividida',
  cruz: 'Cruz',
  diagonal: 'Diagonal',
  xadrez: 'Xadrez',
  borda: 'Borda',
  // Exclusivos da loja.
  divisa: 'Divisa',
  pala: 'Pala',
  aspa: 'Aspa',
  ponta: 'Ponta',
  listrada: 'Listrada',
};

/** Nome de cada cor (paleta e segundas cores), para leitores de tela e dicas. */
export const NOMES_CORES: Record<string, string> = {
  '#e74c3c': 'Vermelho',
  '#3498db': 'Azul',
  '#2ecc71': 'Verde',
  '#f39c12': 'Laranja',
  '#9b59b6': 'Roxo',
  '#1abc9c': 'Turquesa',
  '#e84393': 'Rosa',
  '#f1c40f': 'Amarelo',
  '#f5f5f5': 'Branco',
  '#3f51b5': 'Anil',
  '#a3e635': 'Lima',
  '#1c1410': 'Preto',
  '#f1e6cf': 'Pergaminho',
  '#d4a64a': 'Ouro',
  '#7a2e1f': 'Sangue',
  '#4f6b3a': 'Musgo',
  '#8a8a8a': 'Cinza',
  // Cores da loja.
  '#c9a227': 'Ouro real',
  '#a8b2bd': 'Prata',
};

/** Polígonos da segunda cor, em coordenadas de 0 a 1 (x, y, x, y, …) sobre o retângulo da bandeira. */
export function formasDoPadrao(padrao: PadraoBandeira): number[][] {
  switch (padrao) {
    case 'lisa':
      return [];
    case 'faixa':
      return [[0, 0.34, 1, 0.34, 1, 0.66, 0, 0.66]];
    case 'dividida':
      return [[0.5, 0, 1, 0, 1, 1, 0.5, 1]];
    case 'cruz':
      return [
        [0.4, 0, 0.6, 0, 0.6, 1, 0.4, 1],
        [0, 0.36, 1, 0.36, 1, 0.64, 0, 0.64],
      ];
    case 'diagonal':
      return [[1, 0, 1, 1, 0, 1]];
    case 'xadrez':
      return [
        [0.5, 0, 1, 0, 1, 0.5, 0.5, 0.5],
        [0, 0.5, 0.5, 0.5, 0.5, 1, 0, 1],
      ];
    case 'borda':
      return [
        [0, 0, 1, 0, 1, 0.16, 0, 0.16],
        [0, 0.84, 1, 0.84, 1, 1, 0, 1],
        [0, 0, 0.12, 0, 0.12, 1, 0, 1],
        [0.88, 0, 1, 0, 1, 1, 0.88, 1],
      ];
    // Exclusivos da loja.
    case 'divisa':
      return [[0, 0.72, 0.5, 0.26, 1, 0.72, 1, 1, 0.5, 0.54, 0, 1]];
    case 'pala':
      return [[0.36, 0, 0.64, 0, 0.64, 1, 0.36, 1]];
    case 'aspa':
      return [
        [0, 0, 0.14, 0, 1, 0.86, 1, 1, 0.86, 1, 0, 0.14],
        [1, 0, 1, 0.14, 0.14, 1, 0, 1, 0, 0.86, 0.86, 0],
      ];
    case 'ponta':
      return [[0, 0, 0.55, 0.5, 0, 1]];
    case 'listrada':
      return [
        [0, 0.2, 1, 0.2, 1, 0.4, 0, 0.4],
        [0, 0.6, 1, 0.6, 1, 0.8, 0, 0.8],
      ];
  }
}

/** Nome do título da loja guardado em `jogadores.titulo` (null se não houver ou se for desconhecido). */
export function nomeDoTitulo(titulo: string | null | undefined): string | null {
  return titulo && titulo in TITULOS_LOJA ? TITULOS_LOJA[titulo as keyof typeof TITULOS_LOJA] : null;
}

/** Colunas de `jogadores` que formam a bandeira (liste-as no `select`). */
export const COLUNAS_BANDEIRA = 'cor, cor_secundaria, padrao, emblema';

export type LinhaBandeira = { id: string; cor: string | null; cor_secundaria: string | null; padrao: string | null; emblema: unknown };

/** Bandeira de um jogador lido do banco, com os valores iniciais onde faltar. */
export function bandeiraDoJogador(j: LinhaBandeira): Bandeira {
  return {
    cor: corDoJogador(j),
    corSecundaria: j.cor_secundaria ?? BANDEIRA_INICIAL.corSecundaria,
    padrao: j.padrao && j.padrao in PADROES_INFO ? (j.padrao as PadraoBandeira) : BANDEIRA_INICIAL.padrao,
    // O banco só guarda emblemas que o servidor conferiu; se vier algo estranho, a bandeira fica sem emblema.
    emblema: (() => {
      const v = verificarEmblema(j.emblema);
      return v.ok ? v.emblema : BANDEIRA_INICIAL.emblema;
    })(),
  };
}
