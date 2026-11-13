// Pactos das cartas aceitas: não agressão, lido pela função `cidade` (envio de ataques) e pelo resolver-marchas
// (chegada), e acesso militar, lido pela função `cidade` (por onde as marchas podem passar).
import { grafoDeFronteiras } from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';

/** Fim do pacto de não agressão em vigor entre dois jogadores (ms), ou null. */
export async function fimDoPacto(tx: Transacao, temporadaId: string, a: string, b: string, agora: number): Promise<number | null> {
  const [linha] = await tx<{ ate: Date | null }[]>`
    select max(pacto_ate) as ate from cartas
     where temporada_id = ${temporadaId} and proposta = 'nao_agressao' and pacto_ate > ${new Date(agora)}
       and ((remetente_id = ${a} and destinatario_id = ${b}) or (remetente_id = ${b} and destinatario_id = ${a}))`;
  return linha?.ate ? linha.ate.getTime() : null;
}

/**
 * Por onde as tropas do jogador andam: o grafo de fronteiras, os territórios dele e o corredor (territórios de
 * quem tem acesso militar em vigor com ele). `excetoDono`: tira do corredor as terras desse jogador (o dono do
 * alvo, que não pode ser atacado pelas próprias terras).
 */
export async function terrasParaMarchar(
  tx: Transacao,
  temporadaId: string,
  jogadorId: string,
  agora: number,
  excetoDono: string | null = null,
): Promise<{ grafo: Map<string, string[]>; proprios: Set<string>; corredor: Set<string> }> {
  const fronteiras = await tx<{ territorio_a: string; territorio_b: string }[]>`
    select territorio_a, territorio_b from fronteiras where temporada_id = ${temporadaId}`;
  const territorios = await tx<{ id: string; dono_id: string | null }[]>`
    select id, dono_id from territorios where temporada_id = ${temporadaId} and dono_id is not null`;
  const acessos = await tx<{ parceiro: string }[]>`
    select case when remetente_id = ${jogadorId} then destinatario_id else remetente_id end as parceiro from cartas
     where temporada_id = ${temporadaId} and proposta = 'acesso_militar' and pacto_ate > ${new Date(agora)}
       and (remetente_id = ${jogadorId} or destinatario_id = ${jogadorId})`;
  const parceiros = new Set(acessos.map((a) => a.parceiro));
  if (excetoDono) parceiros.delete(excetoDono);
  return {
    grafo: grafoDeFronteiras(fronteiras.map((f) => [f.territorio_a, f.territorio_b] as const)),
    proprios: new Set(territorios.filter((t) => t.dono_id === jogadorId).map((t) => t.id)),
    corredor: new Set(territorios.filter((t) => t.dono_id !== null && parceiros.has(t.dono_id)).map((t) => t.id)),
  };
}
