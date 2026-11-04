// Ler e mover o herói de um jogador. Usado pela função `cidade` (recrutar, treinar, marchar) e pela
// `resolver-marchas` (batalhas, voltas e batedores). Tudo dentro da transação de quem chama.
import type { Especialidade, Heroi } from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';

export type HeroiSalvo = Heroi & { id: string; jogadorId: string };

type LinhaHeroi = {
  id: string;
  jogador_id: string;
  nome: string;
  especialidade: Especialidade;
  nivel: number;
  territorio_id: string | null;
  marcha_id: string | null;
  treino_pronto_em: Date | null;
  ferido_ate: Date | null;
};

function converter(l: LinhaHeroi | undefined): HeroiSalvo | null {
  if (!l) return null;
  return {
    id: l.id,
    jogadorId: l.jogador_id,
    nome: l.nome,
    especialidade: l.especialidade,
    nivel: l.nivel,
    territorioId: l.territorio_id,
    marchaId: l.marcha_id,
    treinoProntoEm: l.treino_pronto_em?.getTime() ?? null,
    feridoAte: l.ferido_ate?.getTime() ?? null,
  };
}

/** O herói do jogador na temporada (travado até o fim da transação), ou null. */
export async function heroiDoJogador(tx: Transacao, temporadaId: string, jogadorId: string): Promise<HeroiSalvo | null> {
  const [linha] = await tx<LinhaHeroi[]>`
    select id, jogador_id, nome, especialidade, nivel, territorio_id, marcha_id, treino_pronto_em, ferido_ate
      from herois where temporada_id = ${temporadaId} and jogador_id = ${jogadorId}
       for update`;
  return converter(linha);
}

/** O herói parado num território (travado), ou null. */
export async function heroiNoTerritorio(tx: Transacao, territorioId: string): Promise<HeroiSalvo | null> {
  const [linha] = await tx<LinhaHeroi[]>`
    select id, jogador_id, nome, especialidade, nivel, territorio_id, marcha_id, treino_pronto_em, ferido_ate
      from herois where territorio_id = ${territorioId}
       for update`;
  return converter(linha);
}

/** Põe o herói num território ou numa marcha; com `feridoAte`, ele também fica ferido até lá. */
export async function posicionarHeroi(
  tx: Transacao,
  id: string,
  onde: { territorioId: string | null; marchaId: string | null; feridoAte?: number },
): Promise<void> {
  if (onde.feridoAte !== undefined) {
    await tx`
      update herois set territorio_id = ${onde.territorioId}, marcha_id = ${onde.marchaId}, ferido_ate = ${new Date(onde.feridoAte)}
       where id = ${id}`;
  } else {
    await tx`update herois set territorio_id = ${onde.territorioId}, marcha_id = ${onde.marchaId} where id = ${id}`;
  }
}

/** Como o herói aparece nos relatórios (de batalha e de batedor). */
export function heroiNoRelatorio(h: HeroiSalvo, ferido = false) {
  return { nome: h.nome, especialidade: h.especialidade, nivel: h.nivel, ferido };
}
