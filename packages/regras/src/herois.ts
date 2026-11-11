// Heróis: um por jogador na temporada, com nome e uma especialidade que dá um bônus pequeno (GDD: "Heróis").
import { BALANCEAMENTO } from './balanceamento.ts';
import { RECURSOS, TIPOS_ESPECIALIDADE, type Especialidade, type Recurso, type Recursos, type Verificacao } from './tipos.ts';
import { HORA_MS, MINUTO_MS, recursos, temRecursos } from './util.ts';

/**
 * Herói como fica gravado. Num território (`territorioId`) ou numa marcha (`marchaId`), nunca nos dois.
 * O treino sobe o nível na hora em que começa, mas o herói só volta a valer em `treinoProntoEm`.
 */
export type Heroi = {
  nome: string;
  especialidade: Especialidade;
  nivel: number;
  territorioId: string | null;
  marchaId: string | null;
  treinoProntoEm: number | null;
  feridoAte: number | null;
};

export type MotivoRecusaRecrutamento =
  | 'ja_tem_heroi'
  | 'sem_quartel'
  | 'nome_invalido'
  | 'especialidade_invalida'
  | 'sem_populacao'
  | 'recursos_insuficientes';

export type MotivoRecusaTreinoHeroi = 'sem_heroi' | 'nivel_maximo' | 'em_treino' | 'ferido' | 'em_marcha' | 'recursos_insuficientes';

/** Bônus da especialidade no nível dado (`herois.bonusPorNivel` de cada especialidade × nível). */
export function bonusHeroi(nivel: number, especialidade: Especialidade): number {
  return BALANCEAMENTO.herois.bonusPorNivel[especialidade] * nivel;
}

export function heroiEmTreino(heroi: Heroi, agora: number): boolean {
  return heroi.treinoProntoEm !== null && heroi.treinoProntoEm > agora;
}

export function heroiFerido(heroi: Heroi, agora: number): boolean {
  return heroi.feridoAte !== null && heroi.feridoAte > agora;
}

/** Livre para marchar e dar bônus: parado num território, sem treino e sem ferimento. */
export function heroiDisponivel(heroi: Heroi, agora: number): boolean {
  return heroi.territorioId !== null && !heroiEmTreino(heroi, agora) && !heroiFerido(heroi, agora);
}

/** Bônus que o herói dá agora, se for da especialidade pedida e estiver disponível (0 caso contrário). */
export function bonusSeDisponivel(heroi: Heroi | null, especialidade: Especialidade, agora: number): number {
  return heroi && heroi.especialidade === especialidade && heroiDisponivel(heroi, agora) ? bonusHeroi(heroi.nivel, especialidade) : 0;
}

/** Até quando o herói fica ferido depois de perder uma batalha. */
export function feridoAte(agora: number): number {
  return agora + BALANCEAMENTO.herois.feridoHoras * HORA_MS;
}

export function nomeHeroiValido(nome: string): boolean {
  const limpo = nome.trim();
  const { nomeMinimo, nomeMaximo } = BALANCEAMENTO.herois;
  return limpo.length >= nomeMinimo && limpo.length <= nomeMaximo && /^[\p{L}][\p{L} '-]*$/u.test(limpo);
}

/** Confere o recrutamento: um herói por temporada, com Quartel, um habitante livre e o ouro. */
export function verificarRecrutamento(entrada: {
  jaTemHeroi: boolean;
  nivelQuartel: number;
  habitantesLivres: number;
  recursos: Recursos;
  nome: string;
  especialidade: string;
}): Verificacao<{ custo: Recursos; nome: string; especialidade: Especialidade }, MotivoRecusaRecrutamento> {
  const config = BALANCEAMENTO.herois;
  if (entrada.jaTemHeroi) return { ok: false, motivo: 'ja_tem_heroi' };
  if (entrada.nivelQuartel < config.nivelQuartelMinimo) return { ok: false, motivo: 'sem_quartel' };
  if (!nomeHeroiValido(entrada.nome)) return { ok: false, motivo: 'nome_invalido' };
  const especialidade = TIPOS_ESPECIALIDADE.find((e) => e === entrada.especialidade);
  if (!especialidade) return { ok: false, motivo: 'especialidade_invalida' };
  if (entrada.habitantesLivres < 1) return { ok: false, motivo: 'sem_populacao' };
  const custo = { ...config.custoRecrutar };
  if (!temRecursos(entrada.recursos, custo)) return { ok: false, motivo: 'recursos_insuficientes' };
  return { ok: true, custo, nome: entrada.nome.trim(), especialidade };
}

/** Custo do treino para levar o herói ao `nivelAlvo` (2 a 10). */
export function custoTreinoHeroi(nivelAlvo: number): Recursos {
  const { ouroBase, crescimentoOuro } = BALANCEAMENTO.herois.treino;
  return recursos({ ouro: Math.round(ouroBase * crescimentoOuro ** (nivelAlvo - 2)) });
}

/** Duração do treino para o `nivelAlvo`, em ms (arredondada ao minuto). */
export function tempoTreinoHeroiMs(nivelAlvo: number): number {
  const { minutosBase, crescimentoTempo } = BALANCEAMENTO.herois.treino;
  return Math.round(minutosBase * crescimentoTempo ** (nivelAlvo - 2)) * MINUTO_MS;
}

/**
 * Confere o treino: o herói está parado num território (a cidade ou qualquer outro; em marcha, não), livre,
 * abaixo do nível máximo, e há ouro (que sai da cidade). Até a temporada 4, só treinava na cidade.
 */
export function verificarTreinoHeroi(entrada: {
  heroi: Heroi | null;
  recursos: Recursos;
  agora: number;
}): Verificacao<{ nivelAlvo: number; custo: Recursos; prontoEm: number }, MotivoRecusaTreinoHeroi> {
  const { heroi, agora } = entrada;
  if (!heroi) return { ok: false, motivo: 'sem_heroi' };
  if (heroi.nivel >= BALANCEAMENTO.herois.nivelMaximo) return { ok: false, motivo: 'nivel_maximo' };
  if (heroiEmTreino(heroi, agora)) return { ok: false, motivo: 'em_treino' };
  if (heroiFerido(heroi, agora)) return { ok: false, motivo: 'ferido' };
  if (heroi.territorioId === null) return { ok: false, motivo: 'em_marcha' };
  const nivelAlvo = heroi.nivel + 1;
  const custo = custoTreinoHeroi(nivelAlvo);
  if (!temRecursos(entrada.recursos, custo)) return { ok: false, motivo: 'recursos_insuficientes' };
  return { ok: true, nivelAlvo, custo, prontoEm: agora + tempoTreinoHeroiMs(nivelAlvo) };
}

/**
 * Bônus do intendente na economia. Na cidade: toda a produção e o crescimento da população. Noutro território
 * do jogador: `multiplicadorIntendenteTerritorio` vezes o bônus, só no recurso daquele território.
 */
export function bonusIntendente(entrada: {
  heroi: Heroi | null;
  cidadeTerritorioId: string | null;
  /** Recurso de cada território do jogador. */
  recursoDoTerritorio: ReadonlyMap<string, Recurso>;
  agora: number;
}): { bonusTerritorios: Recursos; bonusCrescimento: number } {
  const { heroi, agora } = entrada;
  const nada = { bonusTerritorios: recursos(), bonusCrescimento: 0 };
  const bonus = bonusSeDisponivel(heroi, 'intendente', agora);
  if (!heroi || bonus === 0 || heroi.territorioId === null) return nada;
  if (heroi.territorioId === entrada.cidadeTerritorioId) {
    return { bonusTerritorios: recursos(Object.fromEntries(RECURSOS.map((r) => [r, bonus]))), bonusCrescimento: bonus };
  }
  const recurso = entrada.recursoDoTerritorio.get(heroi.territorioId);
  if (!recurso) return nada;
  return {
    bonusTerritorios: recursos({ [recurso]: bonus * BALANCEAMENTO.herois.multiplicadorIntendenteTerritorio }),
    bonusCrescimento: 0,
  };
}
