import { alcancaOAlvo, parceirosDeAcesso } from '@terra/regras';
import type { DadosMapa, TerritorioMapa } from './useMapa';

/**
 * Por onde as tropas do jogador andam, como o servidor calcula: os territórios dele e o corredor (terras de quem
 * tem acesso militar em vigor com ele). `excetoDono`: tira do corredor as terras do dono do alvo.
 */
export function terrasParaMarchar(dados: DadosMapa, meuId: string, agora: number, excetoDono: string | null = null) {
  const parceiros = new Set(parceirosDeAcesso(dados.acessosMilitares, meuId, agora));
  if (excetoDono) parceiros.delete(excetoDono);
  return {
    grafo: dados.vizinhos,
    proprios: new Set(dados.territorios.filter((t) => t.dono_id === meuId).map((t) => t.id)),
    corredor: new Set(dados.territorios.filter((t) => t.dono_id !== null && parceiros.has(t.dono_id)).map((t) => t.id)),
  };
}

/**
 * Territórios do jogador de onde um ataque ou batedor alcança o alvo: os vizinhos dele primeiro e, com acesso
 * militar, os que chegam pelo corredor, do mais perto ao mais longe.
 */
export function origensQueAlcancam(dados: DadosMapa, alvoId: string, meuId: string, agora: number): TerritorioMapa[] {
  const alvo = dados.territorios.find((t) => t.id === alvoId);
  if (!alvo || alvo.dono_id === meuId) return [];
  const terras = terrasParaMarchar(dados, meuId, agora, alvo.dono_id);
  const vizinhos = new Set(dados.vizinhos.get(alvoId) ?? []);
  const distancia = (t: TerritorioMapa) => Math.hypot(t.x - alvo.x, t.y - alvo.y);
  return dados.territorios
    .filter((t) => t.dono_id === meuId && alcancaOAlvo({ ...terras, origem: t.id, alvo: alvoId }))
    .sort((a, b) => Number(vizinhos.has(b.id)) - Number(vizinhos.has(a.id)) || distancia(a) - distancia(b));
}

/** Donos das terras do corredor que fazem fronteira com o alvo (por onde as tropas chegam pelo acesso militar). */
export function quemDaPassagem(dados: DadosMapa, alvoId: string, meuId: string, agora: number): string[] {
  const alvo = dados.territorios.find((t) => t.id === alvoId);
  if (!alvo) return [];
  const { corredor } = terrasParaMarchar(dados, meuId, agora, alvo.dono_id);
  const donos = new Set<string>();
  for (const v of dados.vizinhos.get(alvoId) ?? []) {
    const dono = dados.territorios.find((t) => t.id === v)?.dono_id;
    if (corredor.has(v) && dono) donos.add(dono);
  }
  return [...donos];
}
