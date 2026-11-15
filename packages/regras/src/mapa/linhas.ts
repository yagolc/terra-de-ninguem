// Linhas do banco de uma temporada nova a partir do mapa gerado: regiões, territórios, fronteiras, barreiras, bárbaros
// e povoados. Usado pela Edge Function `salas` (criar sala, temporada nova de uma sala). Fica fora do `index.ts`,
// junto com o gerador. Os ids vêm de quem chama (as regras não sorteiam nada).
import { TIPOS_UNIDADE, type Exercito, type Recurso, type Terreno, type TipoPovoado } from '../tipos.ts';
import { totalUnidades } from '../util.ts';
import type { MapaGerado, TipoBarreira } from './gerador.ts';

export type LinhasDoMapa = {
  regioes: { id: string; indice: number; nome: string; terreno: Terreno }[];
  territorios: {
    id: string;
    regiao_id: string;
    indice: number;
    nome: string;
    terreno: Terreno;
    bonus_recurso: Recurso;
    x: number;
    y: number;
    poligono: [number, number][];
    vaga_inicial: boolean;
    guarnicao_inicial: Exercito;
  }[];
  /** Pares em ordem (a < b), como o `temporada:nova` grava. */
  fronteiras: { territorio_a: string; territorio_b: string }[];
  barreiras: { territorio_a: string; territorio_b: string; tipo: TipoBarreira }[];
  /** Bárbaros: uma linha sem dono em cada território neutro com guarnição. */
  tropas: ({ territorio_id: string } & Exercito)[];
  povoados: { territorio_id: string; tipo: TipoPovoado }[];
};

export function linhasDoMapa(mapa: MapaGerado, novoId: () => string): LinhasDoMapa {
  const idsRegioes = mapa.regioes.map(() => novoId());
  const idsTerritorios = mapa.territorios.map(() => novoId());
  const par = (a: number, b: number) => [idsTerritorios[a]!, idsTerritorios[b]!].sort() as [string, string];
  const exercitoDe = (e: Exercito) => Object.fromEntries(TIPOS_UNIDADE.map((tipo) => [tipo, e[tipo]])) as Exercito;

  return {
    regioes: mapa.regioes.map((r) => ({ id: idsRegioes[r.indice]!, indice: r.indice, nome: r.nome, terreno: r.terreno })),
    territorios: mapa.territorios.map((t) => ({
      id: idsTerritorios[t.indice]!,
      regiao_id: idsRegioes[t.regiao]!,
      indice: t.indice,
      nome: t.nome,
      terreno: t.terreno,
      bonus_recurso: t.bonus,
      x: t.x,
      y: t.y,
      poligono: t.poligono.map(([x, y]) => [x, y] as [number, number]),
      vaga_inicial: mapa.iniciais.includes(t.indice),
      guarnicao_inicial: exercitoDe(t.guarnicao),
    })),
    fronteiras: mapa.fronteiras.map(([a, b]) => {
      const [x, y] = par(a, b);
      return { territorio_a: x, territorio_b: y };
    }),
    barreiras: mapa.barreiras.map(({ a, b, tipo }) => {
      const [x, y] = par(a, b);
      return { territorio_a: x, territorio_b: y, tipo };
    }),
    tropas: mapa.territorios
      .filter((t) => totalUnidades(t.guarnicao) > 0)
      .map((t) => ({ territorio_id: idsTerritorios[t.indice]!, ...exercitoDe(t.guarnicao) })),
    povoados: mapa.povoados.map((p) => ({ territorio_id: idsTerritorios[p.indice]!, tipo: p.tipo })),
  };
}
