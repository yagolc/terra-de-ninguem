// Pets da cidade: comprados na loja (só visuais), moram na cidade do dono e podem ser sequestrados num saque.
import { BALANCEAMENTO } from './balanceamento.ts';
import type { Verificacao } from './tipos.ts';

export type TipoPet = keyof typeof BALANCEAMENTO.pets.precos;
export const TIPOS_PET = Object.keys(BALANCEAMENTO.pets.precos) as TipoPet[];

export function tipoPetValido(tipo: unknown): tipo is TipoPet {
  return typeof tipo === 'string' && (TIPOS_PET as string[]).includes(tipo);
}

/** Pet de um jogador na temporada: onde está (`mantidoPor`: a cidade do dono ou a de quem sequestrou). */
export type PetNaTemporada = { donoId: string; tipo: TipoPet; mantidoPor: string };

export type PetNoSaque = { acao: 'resgatou' | 'sequestrou'; donoId: string; tipo: TipoPet };

/**
 * Saque vencedor contra a cidade do defensor: leva no máximo um pet. Primeiro o atacante resgata o próprio pet,
 * se ele estiver refém ali; senão leva o pet do defensor, se estiver em casa. Pets reféns de outros jogadores
 * ficam onde estão (só o dono resgata).
 */
export function petNoSaque(entrada: { pets: readonly PetNaTemporada[]; atacanteId: string; defensorId: string }): PetNoSaque | null {
  const { pets, atacanteId, defensorId } = entrada;
  const meu = pets.find((p) => p.donoId === atacanteId && p.mantidoPor === defensorId);
  if (meu) return { acao: 'resgatou', donoId: meu.donoId, tipo: meu.tipo };
  const dele = pets.find((p) => p.donoId === defensorId && p.mantidoPor === defensorId);
  if (dele) return { acao: 'sequestrou', donoId: dele.donoId, tipo: dele.tipo };
  return null;
}

export type MotivoRecusaPet =
  | 'pet_nao_comprado'
  | 'pet_refem'
  | 'pet_nao_e_refem'
  | 'preco_invalido'
  | 'sem_preco'
  | 'ouro_insuficiente';

/** Escolher o pet que mora na cidade (ou nenhum): só um comprado, e não dá para trocar enquanto o atual é refém. */
export function verificarEscolhaPet(entrada: {
  tipo: unknown;
  comprados: readonly TipoPet[];
  atual: PetNaTemporada | null;
}): Verificacao<{ tipo: TipoPet | null }, MotivoRecusaPet> {
  const { tipo, comprados, atual } = entrada;
  if (atual && atual.mantidoPor !== atual.donoId) return { ok: false, motivo: 'pet_refem' };
  if (tipo === null) return { ok: true, tipo: null };
  if (!tipoPetValido(tipo) || !comprados.includes(tipo)) return { ok: false, motivo: 'pet_nao_comprado' };
  return { ok: true, tipo };
}

/** Preço do resgate que o sequestrador pede: ouro inteiro de 1 a `resgateMaximo`. */
export function verificarPrecoResgate(entrada: { ouro: unknown; pet: PetNaTemporada | null; sequestradorId: string }): Verificacao<{ ouro: number }, MotivoRecusaPet> {
  const { ouro, pet, sequestradorId } = entrada;
  if (!pet || pet.mantidoPor !== sequestradorId || pet.donoId === sequestradorId) return { ok: false, motivo: 'pet_nao_e_refem' };
  if (typeof ouro !== 'number' || !Number.isInteger(ouro) || ouro < 1 || ouro > BALANCEAMENTO.pets.resgateMaximo) {
    return { ok: false, motivo: 'preco_invalido' };
  }
  return { ok: true, ouro };
}

/** Dono paga o resgate pedido: o pet tem de ser refém, com preço, e o dono precisa ter o ouro. */
export function verificarPagamentoResgate(entrada: {
  pet: PetNaTemporada | null;
  donoId: string;
  preco: number | null;
  ouro: number;
}): Verificacao<{ ouro: number }, MotivoRecusaPet> {
  const { pet, donoId, preco, ouro } = entrada;
  if (!pet || pet.donoId !== donoId || pet.mantidoPor === donoId) return { ok: false, motivo: 'pet_nao_e_refem' };
  if (preco === null) return { ok: false, motivo: 'sem_preco' };
  if (ouro < preco) return { ok: false, motivo: 'ouro_insuficiente' };
  return { ok: true, ouro: preco };
}
