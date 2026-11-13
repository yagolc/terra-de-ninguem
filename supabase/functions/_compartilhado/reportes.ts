// Feedback (função `cidade`, sem temporada): enviar um relato de bug ou sugestão, votar e, para o organizador,
// mudar o status e responder.
import {
  MENSAGENS_ATUALIZACAO_REPORTE,
  MENSAGENS_REPORTE,
  verificarAtualizacaoReporte,
  verificarReporte,
} from '../../../packages/regras/src/index.ts';
import type { Transacao } from './db.ts';
import { ErroDoJogo } from './http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CAMPOS_CONTEXTO = ['navegador', 'sistema', 'tela', 'versao', 'aba', 'temporada', 'instalado'] as const;

/** Só os campos conhecidos do contexto, como texto curto (o site monta; nada de confiar no formato). */
function limparContexto(valor: unknown): Record<string, string> {
  const v = (valor && typeof valor === 'object' ? valor : {}) as Record<string, unknown>;
  const limpo: Record<string, string> = {};
  for (const campo of CAMPOS_CONTEXTO) {
    if (v[campo] !== undefined && v[campo] !== null) limpo[campo] = String(v[campo]).slice(0, 200);
  }
  return limpo;
}

export async function enviarReporte(tx: Transacao, jogadorId: string, corpo: Record<string, unknown>) {
  // Trava o jogador para o limite por hora valer com dois envios ao mesmo tempo.
  await tx`select id from jogadores where id = ${jogadorId} for update`;
  const [{ envios } = { envios: 0 }] = await tx<{ envios: number }[]>`
    select count(*)::int as envios from reportes where jogador_id = ${jogadorId} and criado_em > now() - interval '1 hour'`;
  const v = verificarReporte({
    tipo: corpo.tipo,
    area: corpo.area,
    titulo: corpo.titulo,
    descricao: corpo.descricao,
    gravidade: corpo.gravidade,
    passos: corpo.passos,
    esperado: corpo.esperado,
    aconteceu: corpo.aconteceu,
    enviosNaUltimaHora: envios,
  });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_REPORTE[v.motivo]);
  const r = v.reporte;
  const [linha] = await tx<{ id: string; numero: number }[]>`
    insert into reportes (jogador_id, tipo, area, gravidade, titulo, descricao, passos, esperado, aconteceu, contexto)
    values (${jogadorId}, ${r.tipo}, ${r.area}, ${r.gravidade}, ${r.titulo}, ${r.descricao}, ${r.passos}, ${r.esperado},
            ${r.aconteceu}, ${tx.json(limparContexto(corpo.contexto))})
    returning id, numero`;
  // Quem relata já conta como um voto.
  await tx`insert into votos_reportes (reporte_id, jogador_id) values (${linha!.id}, ${jogadorId})`;
  return { numero: linha!.numero };
}

/** Liga ou desliga o voto do jogador no relato. */
export async function votarReporte(tx: Transacao, jogadorId: string, reporteId: unknown) {
  const id = String(reporteId ?? '');
  if (!UUID.test(id)) throw new ErroDoJogo('Relato desconhecido.');
  const [existe] = await tx<{ id: string }[]>`select id from reportes where id = ${id}`;
  if (!existe) throw new ErroDoJogo('Relato desconhecido.');
  const apagados = await tx`delete from votos_reportes where reporte_id = ${id} and jogador_id = ${jogadorId} returning reporte_id`;
  if (apagados.length === 0) await tx`insert into votos_reportes (reporte_id, jogador_id) values (${id}, ${jogadorId})`;
  return { votou: apagados.length === 0 };
}

/** O organizador muda o status e a resposta; quem relatou recebe um aviso. */
export async function atualizarReporte(tx: Transacao, jogadorId: string, corpo: Record<string, unknown>) {
  const id = String(corpo.reporte_id ?? '');
  if (!UUID.test(id)) throw new ErroDoJogo('Relato desconhecido.');
  const [org] = await tx<{ ok: boolean }[]>`select exists (select 1 from organizadores where jogador_id = ${jogadorId}) as ok`;
  const v = verificarAtualizacaoReporte({ organizador: !!org?.ok, status: corpo.status, resposta: corpo.resposta });
  if (!v.ok) throw new ErroDoJogo(MENSAGENS_ATUALIZACAO_REPORTE[v.motivo]);
  const linhas = await tx`
    update reportes
       set status = ${v.status}, resposta = ${v.resposta}, atualizado_em = now(),
           -- Nas expressões do SET, status e resposta ainda são os antigos: só avisa se algo mudou.
           status_avisado = status_avisado and status = ${v.status} and resposta is not distinct from ${v.resposta}
     where id = ${id}
    returning numero`;
  if (linhas.length === 0) throw new ErroDoJogo('Relato desconhecido.');
  return { status: v.status };
}
