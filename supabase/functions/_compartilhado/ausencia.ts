// Jogador ausente (regras: packages/regras/src/ausencia.ts). Cada comando (e a ação `presenca`, que o site manda
// ao abrir) grava `cidades.visto_em`; quem volta de uma ausência ganha um escudo. A cada minuto o resolver-marchas
// chama `cuidarDosAusentes`: marca quem ficou ausente e rebela um território dele quando é a hora.
import {
  BALANCEAMENTO,
  escudoDeRetornoAte,
  exercito,
  guarnicaoRebelde,
  proximaRebeliaoEm,
  territorioQueSeRebela,
  totalUnidades,
} from '../../../packages/regras/src/index.ts';
import { SALA_PRINCIPAL, avancarAteAgora, carregarCidade, grupoEm, salvarCidade } from './cidade.ts';
import { sql, type Transacao } from './db.ts';
import { posicionarHeroi } from './herois.ts';

/**
 * O jogador apareceu na partida (a temporada do site, ou a da Sala principal): grava `visto_em` e, se ele estava
 * ausente, tira o 💤 e dá o escudo de retorno.
 */
export async function marcarPresenca(jogadorId: string, temporadaId: string | null): Promise<void> {
  const linhas = await sql<{ temporada_id: string; voltou: boolean }[]>`
    with antes as (
      select c.id, c.ausente_desde
        from cidades c join temporadas t on t.id = c.temporada_id
       where c.jogador_id = ${jogadorId} and t.status = 'ativa'
         and (case when ${temporadaId}::text is null then t.sala_id = ${SALA_PRINCIPAL} else t.id::text = ${temporadaId} end)
    )
    update cidades c set visto_em = now(), ausente_desde = null
      from antes where c.id = antes.id
    returning c.temporada_id, antes.ausente_desde is not null as voltou`;
  for (const l of linhas) {
    if (!l.voltou) continue;
    await sql`
      insert into protecoes (temporada_id, jogador_id, tipo, ate)
      values (${l.temporada_id}, ${jogadorId}, 'escudo', ${new Date(escudoDeRetornoAte(Date.now()))})
      on conflict (temporada_id, jogador_id, tipo) do update set ate = greatest(protecoes.ate, excluded.ate)`;
  }
}

/**
 * Um território do ausente se rebela: vira neutro com a guarnição rebelde (as tropas que ele deixou ali, completadas
 * até a fração do exército médio dos ativos). Estrutura e estrada caem, o povoado perde a posse, o herói que estava
 * lá volta para a cidade. Confere de novo, com a cidade travada, se ainda é a hora.
 */
async function rebelar(tx: Transacao, temporadaId: string, jogadorId: string, agora: number): Promise<boolean> {
  const c = avancarAteAgora(await carregarCidade(tx, temporadaId, jogadorId), agora);
  const [estado] = await tx<{ ausente_desde: Date | null; ultima_rebeliao: Date | null }[]>`
    select ausente_desde, ultima_rebeliao from cidades where id = ${c.carregada.id}`;
  if (!estado?.ausente_desde) return false;
  if (agora < proximaRebeliaoEm(estado.ausente_desde.getTime(), estado.ultima_rebeliao?.getTime() ?? null)) return false;

  const cidadeId = c.carregada.territorioId;
  const fronteiras = await tx<{ territorio_a: string; territorio_b: string }[]>`
    select territorio_a, territorio_b from fronteiras where temporada_id = ${temporadaId}`;
  const alvo = cidadeId
    ? territorioQueSeRebela({
        cidadeId,
        territorios: [...c.carregada.territoriosProprios],
        fronteiras: fronteiras.map((f) => [f.territorio_a, f.territorio_b] as const),
      })
    : null;
  // Nada para rebelar (só a cidade): marca assim mesmo, para olhar de novo só no próximo intervalo.
  await tx`update cidades set ultima_rebeliao = ${new Date(agora)} where id = ${c.carregada.id}`;
  if (!alvo) return false;

  await tx`select id from territorios where id = ${alvo} for update`;
  // Exército de cada jogador ativo da temporada (parado e em marcha), para a guarnição acompanhar o ritmo do jogo.
  const ativos = await tx<{ soldados: number }[]>`
    select (coalesce((select sum(lanceiro + arqueiro + cavalaria) from tropas
                       where temporada_id = c.temporada_id and dono_id = c.jogador_id), 0)
          + coalesce((select sum(lanceiro + arqueiro + cavalaria) from marchas
                       where temporada_id = c.temporada_id and jogador_id = c.jogador_id and status = 'a_caminho'), 0))::int as soldados
      from cidades c where c.temporada_id = ${temporadaId} and c.ausente_desde is null`;
  const grupo = grupoEm(c, alvo);
  const guarnicao = guarnicaoRebelde({ deixadas: grupo.tropas, soldadosDosAtivos: ativos.map((a) => a.soldados) });
  grupo.tropas = exercito();

  await tx`update territorios set dono_id = null where id = ${alvo}`;
  await tx`delete from estruturas where territorio_id = ${alvo}`;
  await tx`delete from estradas where territorio_id = ${alvo}`;
  await tx`update filas_treino set territorio_id = null where territorio_id = ${alvo}`;
  await tx`update povoados set posse_desde = null, leal_desde = null, milicia = 0 where territorio_id = ${alvo}`;
  if (totalUnidades(guarnicao) > 0) {
    await tx`
      insert into tropas (temporada_id, territorio_id, dono_id, lanceiro, arqueiro, cavalaria)
      values (${temporadaId}, ${alvo}, null, ${guarnicao.lanceiro}, ${guarnicao.arqueiro}, ${guarnicao.cavalaria})`;
  }
  if (c.carregada.heroi?.territorioId === alvo) {
    await posicionarHeroi(tx, c.carregada.heroi.id, { territorioId: cidadeId, marchaId: null });
  }
  await salvarCidade(tx, c);
  await tx`insert into rebelioes (temporada_id, jogador_id, territorio_id) values (${temporadaId}, ${jogadorId}, ${alvo})`;
  return true;
}

/** Marca quem ficou ausente e rebela, de cada um, o território da vez. Cada sala e cada rebelião na sua transação. */
export async function cuidarDosAusentes(erros: string[], temporadasAtivas: readonly string[]): Promise<number> {
  let rebeldes = 0;
  for (const temporadaId of temporadasAtivas) {
    let ausentes: { jogador_id: string; ausente_desde: Date; ultima_rebeliao: Date | null }[] = [];
    try {
      await sql`
        update cidades set ausente_desde = visto_em + make_interval(days => ${BALANCEAMENTO.ausencia.diasParaAusente})
         where temporada_id = ${temporadaId} and ausente_desde is null
           and visto_em + make_interval(days => ${BALANCEAMENTO.ausencia.diasParaAusente}) <= now()`;
      ausentes = await sql`
        select jogador_id, ausente_desde, ultima_rebeliao from cidades
         where temporada_id = ${temporadaId} and ausente_desde is not null`;
    } catch (erro) {
      console.error('ausentes', temporadaId, erro);
      erros.push(`ausentes ${temporadaId}`);
      continue;
    }
    const agora = Date.now();
    for (const a of ausentes) {
      if (agora < proximaRebeliaoEm(a.ausente_desde.getTime(), a.ultima_rebeliao?.getTime() ?? null)) continue;
      try {
        if (await sql.begin((tx) => rebelar(tx, temporadaId, a.jogador_id, agora))) rebeldes++;
      } catch (erro) {
        console.error('rebelião', temporadaId, a.jogador_id, erro);
        erros.push(`rebelião ${a.jogador_id}`);
      }
    }
  }
  return rebeldes;
}
