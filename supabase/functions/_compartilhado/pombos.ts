// Pactos de não agressão (cartas aceitas), lidos pela função `cidade` (envio de ataques) e pelo resolver-marchas (chegada).
import type { Transacao } from './db.ts';

/** Fim do pacto de não agressão em vigor entre dois jogadores (ms), ou null. */
export async function fimDoPacto(tx: Transacao, temporadaId: string, a: string, b: string, agora: number): Promise<number | null> {
  const [linha] = await tx<{ ate: Date | null }[]>`
    select max(pacto_ate) as ate from cartas
     where temporada_id = ${temporadaId} and pacto_ate > ${new Date(agora)}
       and ((remetente_id = ${a} and destinatario_id = ${b}) or (remetente_id = ${b} and destinatario_id = ${a}))`;
  return linha?.ate ? linha.ate.getTime() : null;
}
