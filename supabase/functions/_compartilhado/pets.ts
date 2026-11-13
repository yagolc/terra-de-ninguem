// Pets da cidade (função `cidade` e `resolver-marchas`): escolher o pet que mora na cidade, o resgate em ouro
// (pedir, pagar, libertar) e o sequestro ou resgate num saque vencedor.
import {
  MENSAGENS_PET,
  petNoSaque,
  receberSaque,
  verificarEscolhaPet,
  verificarPagamentoResgate,
  verificarPrecoResgate,
  type PetNaTemporada,
  type PetNoSaque,
  type TipoPet,
} from '../../../packages/regras/src/index.ts';
import { avancarAteAgora, carregarCidade, salvarCidade, temporadaAtiva } from './cidade.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';
import { desbloqueiosDoJogador } from './loja.ts';

type LinhaPet = { dono_id: string; tipo: TipoPet; mantido_por: string; resgate_ouro: number | null };
const converter = (l: LinhaPet): PetNaTemporada => ({ donoId: l.dono_id, tipo: l.tipo, mantidoPor: l.mantido_por });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function petDe(tx: Transacao, temporadaId: string, donoId: string): Promise<LinhaPet | null> {
  if (!UUID.test(donoId)) return null;
  const [l] = await tx<LinhaPet[]>`
    select dono_id, tipo, mantido_por, resgate_ouro from pets
     where temporada_id = ${temporadaId} and dono_id = ${donoId} for update`;
  return l ?? null;
}

/** Escolhe o pet que mora na cidade nesta temporada (null tira). Não troca enquanto o pet é refém. */
export async function escolherPet(tx: Transacao, jogadorId: string, tipo: unknown) {
  const temporada = await temporadaAtiva(tx);
  const atual = await petDe(tx, temporada.id, jogadorId);
  const v = verificarEscolhaPet({
    tipo: tipo ?? null,
    comprados: (await desbloqueiosDoJogador(tx, jogadorId)).pets,
    atual: atual && converter(atual),
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_PET[v.motivo]);
  if (v.tipo === null) {
    await tx`delete from pets where temporada_id = ${temporada.id} and dono_id = ${jogadorId}`;
  } else {
    await tx`
      insert into pets (temporada_id, dono_id, tipo, mantido_por) values (${temporada.id}, ${jogadorId}, ${v.tipo}, ${jogadorId})
      on conflict (temporada_id, dono_id) do update set tipo = excluded.tipo`;
  }
  return { tipo: v.tipo };
}

/** O sequestrador pede (ou muda) o resgate em ouro do pet de `donoId`. */
export async function pedirResgate(tx: Transacao, jogadorId: string, donoId: unknown, ouro: unknown) {
  const temporada = await temporadaAtiva(tx);
  const pet = await petDe(tx, temporada.id, String(donoId ?? ''));
  const v = verificarPrecoResgate({ ouro, pet: pet && converter(pet), sequestradorId: jogadorId });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_PET[v.motivo]);
  await tx`
    update pets set resgate_ouro = ${v.ouro}, evento = 'preco', evento_avisado = false
     where temporada_id = ${temporada.id} and dono_id = ${pet!.dono_id}`;
  return { ouro: v.ouro };
}

/** O sequestrador devolve o pet de graça. */
export async function libertarPet(tx: Transacao, jogadorId: string, donoId: unknown) {
  const temporada = await temporadaAtiva(tx);
  const pet = await petDe(tx, temporada.id, String(donoId ?? ''));
  if (!pet || pet.mantido_por !== jogadorId || pet.dono_id === jogadorId) throw new ErroDoJogo(MENSAGENS_PET.pet_nao_e_refem);
  await tx`
    update pets set mantido_por = dono_id, sequestrado_em = null, resgate_ouro = null, evento = 'libertado', evento_avisado = false
     where temporada_id = ${temporada.id} and dono_id = ${pet.dono_id}`;
  return { libertado: true };
}

/**
 * O dono paga o resgate pedido: o ouro sai da cidade dele e entra na do sequestrador (até o armazém dele), e o
 * pet volta. As duas cidades são travadas na ordem dos ids, como no resolver-marchas.
 */
export async function pagarResgate(tx: Transacao, jogadorId: string) {
  const temporada = await temporadaAtiva(tx);
  const pet = await petDe(tx, temporada.id, jogadorId);
  if (!pet || pet.mantido_por === jogadorId) throw new ErroDoJogo(MENSAGENS_PET.pet_nao_e_refem);
  const ordem = await tx<{ jogador_id: string }[]>`
    select jogador_id from cidades
     where temporada_id = ${temporada.id} and jogador_id in (${jogadorId}, ${pet.mantido_por}) order by id`;
  const agora = Date.now();
  const cidades = new Map<string, ReturnType<typeof avancarAteAgora>>();
  for (const { jogador_id } of ordem) cidades.set(jogador_id, avancarAteAgora(await carregarCidade(tx, temporada.id, jogador_id), agora));
  const dono = cidades.get(jogadorId);
  const sequestrador = cidades.get(pet.mantido_por);
  if (!dono || !sequestrador) throw new ErroDoJogo('Cidade não encontrada nesta temporada.', 409);

  const v = verificarPagamentoResgate({ pet: converter(pet), donoId: jogadorId, preco: pet.resgate_ouro, ouro: dono.estado.recursos.ouro });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_PET[v.motivo]);
  dono.estado = { ...dono.estado, recursos: { ...dono.estado.recursos, ouro: dono.estado.recursos.ouro - v.ouro } };
  sequestrador.estado = {
    ...sequestrador.estado,
    recursos: receberSaque(sequestrador.estado.recursos, { comida: 0, madeira: 0, ouro: v.ouro }, sequestrador.estado.predios.armazem),
  };
  for (const c of cidades.values()) await salvarCidade(tx, c);
  await tx`
    update pets set mantido_por = dono_id, sequestrado_em = null, evento = 'pago', evento_avisado = false
     where temporada_id = ${temporada.id} and dono_id = ${jogadorId}`;
  return { ouro: v.ouro };
}

/**
 * Saque vencedor contra a cidade principal do defensor: resgata o pet do atacante que estava refém ali ou leva o do
 * defensor (no máximo um). Devolve o que aconteceu, para o relatório.
 */
export async function moverPetNoSaque(
  tx: Transacao,
  temporadaId: string,
  atacanteId: string,
  defensorId: string,
  agora: number,
): Promise<PetNoSaque | null> {
  const linhas = await tx<LinhaPet[]>`
    select dono_id, tipo, mantido_por, resgate_ouro from pets
     where temporada_id = ${temporadaId} and mantido_por = ${defensorId} for update`;
  const r = petNoSaque({ pets: linhas.map(converter), atacanteId, defensorId });
  if (r?.acao === 'resgatou') {
    await tx`
      update pets set mantido_por = dono_id, sequestrado_em = null, resgate_ouro = null, evento = null
       where temporada_id = ${temporadaId} and dono_id = ${r.donoId}`;
  } else if (r?.acao === 'sequestrou') {
    await tx`
      update pets set mantido_por = ${atacanteId}, sequestrador_id = ${atacanteId}, sequestrado_em = ${new Date(agora)}, resgate_ouro = null, evento = null
       where temporada_id = ${temporadaId} and dono_id = ${r.donoId}`;
  }
  return r;
}
