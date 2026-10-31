// Edge Function `resolver-marchas`: chamada a cada minuto pelo pg_cron (migration 0007).
// Resolve as marchas que já chegaram: batalha, perdas, saque, conquista, escudo e relatório;
// e entrega as tropas (e o saque) das marchas de volta. Cada marcha numa transação própria.
// Depois atualiza o placar e encerra a temporada se alguém cumpriu o objetivo ou o prazo acabou.
// Publicar com: npx supabase functions deploy resolver-marchas --no-verify-jwt
// Exige o cabeçalho x-segredo-cron igual à variável SEGREDO_CRON (npx supabase secrets set).
import {
  calcularSaque,
  duracaoMarchaMs,
  duracaoReconhecimentoMs,
  escudoAte,
  exercito,
  geradorComSemente,
  receberSaque,
  recursos,
  resolverBatalha,
  sementeDeTexto,
  somarExercitos,
  sortearSorte,
  subtrairRecursos,
  totalUnidades,
  type Exercito,
  type Recursos,
  type Terreno,
} from '../../../packages/regras/src/index.ts';
import { avancarAteAgora, carregarCidade, grupoEm, salvarCidade, type CidadeAvancada } from '../_compartilhado/cidade.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { atualizarPlacar } from '../_compartilhado/objetivos.ts';
import { resposta } from '../_compartilhado/http.ts';

type Marcha = {
  id: string;
  temporada_id: string;
  jogador_id: string;
  origem_id: string;
  destino_id: string;
  tipo: 'saque' | 'conquista' | 'retorno' | 'movimento' | 'reconhecimento';
  lanceiro: number;
  arqueiro: number;
  cavalaria: number;
  saque_comida: number;
  saque_madeira: number;
  saque_ouro: number;
};

type Territorio = { id: string; dono_id: string | null; cidade_principal: boolean; terreno: Terreno; x: number; y: number };

const tropasDa = (m: Marcha): Exercito => exercito({ lanceiro: m.lanceiro, arqueiro: m.arqueiro, cavalaria: m.cavalaria });

async function territorio(tx: Transacao, id: string): Promise<Territorio> {
  const [t] = await tx<Territorio[]>`select id, dono_id, cidade_principal, terreno, x, y from territorios where id = ${id} for update`;
  return t!;
}

async function concluir(tx: Transacao, marchaId: string) {
  await tx`update marchas set status = 'concluida' where id = ${marchaId}`;
}

/** Tropas que voltam para casa (com ou sem saque). */
async function mandarDeVolta(tx: Transacao, m: Marcha, de: Territorio, sobreviventes: Exercito, saque: Recursos, agora: number) {
  if (totalUnidades(sobreviventes) === 0) return;
  const [casa] = await tx<{ x: number; y: number }[]>`select x, y from territorios where id = ${m.origem_id}`;
  const chegada = agora + duracaoMarchaMs(de, casa!, sobreviventes);
  await tx`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria,
                         saque_comida, saque_madeira, saque_ouro, partida_em, chegada_em)
    values (${m.temporada_id}, ${m.jogador_id}, ${de.id}, ${m.origem_id}, 'retorno',
            ${sobreviventes.lanceiro}, ${sobreviventes.arqueiro}, ${sobreviventes.cavalaria},
            ${saque.comida}, ${saque.madeira}, ${saque.ouro}, ${new Date(agora)}, ${new Date(chegada)})`;
}

async function resolverAtaque(tx: Transacao, m: Marcha, agora: number) {
  const destino = await territorio(tx, m.destino_id);
  const atacanteDaMarcha = tropasDa(m);
  const tipo = m.tipo as 'saque' | 'conquista';

  // Trava as cidades sempre na mesma ordem (por id do jogador) para não haver impasse entre transações.
  const ids = [m.jogador_id, destino.dono_id].filter((id): id is string => !!id).sort();
  const cidades = new Map<string, CidadeAvancada>();
  for (const id of [...new Set(ids)]) cidades.set(id, avancarAteAgora(await carregarCidade(tx, m.temporada_id, id), agora));
  const atacante = cidades.get(m.jogador_id)!;
  // Se o alvo virou do próprio atacante enquanto a marcha andava (ex.: conquista anterior), vira reforço.
  if (destino.dono_id === m.jogador_id) {
    grupoEm(atacante, destino.id).tropas = somarExercitos(grupoEm(atacante, destino.id).tropas, atacanteDaMarcha);
    await salvarCidade(tx, atacante);
    await concluir(tx, m.id);
    return;
  }
  const defensor = destino.dono_id ? cidades.get(destino.dono_id)! : null;

  // Exército que defende: as tropas do dono no território, ou os bárbaros.
  const [barbaros] = defensor
    ? []
    : await tx<{ id: string; lanceiro: number; arqueiro: number; cavalaria: number }[]>`
        select id, lanceiro, arqueiro, cavalaria from tropas
         where territorio_id = ${destino.id} and dono_id is null for update`;
  const grupoDefensor = defensor ? grupoEm(defensor, destino.id) : null;
  const exercitoDefensor = grupoDefensor ? grupoDefensor.tropas : exercito(barbaros);

  const batalha = resolverBatalha({
    atacante: atacanteDaMarcha,
    defensor: exercitoDefensor,
    terreno: destino.terreno,
    nivelMuralha: defensor && destino.cidade_principal ? defensor.estado.predios.muralha : 0,
    sorte: sortearSorte(geradorComSemente(sementeDeTexto(m.id))),
    alvoCidadePrincipal: destino.cidade_principal,
  });
  const atacanteVenceu = batalha.vencedor === 'atacante';
  const conquistou = tipo === 'conquista' && batalha.permiteConquista;

  // Saque: só uma cidade tem estoque para levar.
  let saque = recursos();
  if (tipo === 'saque' && atacanteVenceu && defensor && destino.cidade_principal) {
    saque = calcularSaque({
      estoque: defensor.estado.recursos,
      nivelArmazem: defensor.estado.predios.armazem,
      sobreviventes: batalha.sobreviventesAtacante,
    });
    defensor.estado = { ...defensor.estado, recursos: subtrairRecursos(defensor.estado.recursos, saque) };
  }

  // Perdas e posse do território.
  if (conquistou) {
    // O atacante fica no território; os sobreviventes do defensor recuam para a cidade dele (bárbaros se dispersam).
    await tx`update territorios set dono_id = ${m.jogador_id} where id = ${destino.id}`;
    grupoEm(atacante, destino.id).tropas = batalha.sobreviventesAtacante;
    if (defensor && grupoDefensor) {
      grupoDefensor.tropas = exercito();
      if (defensor.carregada.territorioId) {
        const casa = grupoEm(defensor, defensor.carregada.territorioId);
        casa.tropas = somarExercitos(casa.tropas, batalha.sobreviventesDefensor);
      }
    } else if (barbaros) {
      await tx`delete from tropas where id = ${barbaros.id}`;
    }
  } else {
    if (grupoDefensor) grupoDefensor.tropas = batalha.sobreviventesDefensor;
    else if (barbaros) {
      const s = batalha.sobreviventesDefensor;
      if (totalUnidades(s) === 0) await tx`delete from tropas where id = ${barbaros.id}`;
      else await tx`update tropas set lanceiro = ${s.lanceiro}, arqueiro = ${s.arqueiro}, cavalaria = ${s.cavalaria} where id = ${barbaros.id}`;
    }
    await mandarDeVolta(tx, m, destino, batalha.sobreviventesAtacante, saque, agora);
  }

  // Quem perde uma defesa ganha escudo.
  if (defensor && atacanteVenceu) {
    await tx`
      insert into protecoes (temporada_id, jogador_id, tipo, ate)
      values (${m.temporada_id}, ${destino.dono_id}, 'escudo', ${new Date(escudoAte(agora))})
      on conflict (temporada_id, jogador_id, tipo) do update set ate = greatest(protecoes.ate, excluded.ate)`;
  }

  for (const cidade of cidades.values()) await salvarCidade(tx, cidade);
  await concluir(tx, m.id);

  await tx`
    insert into relatorios (temporada_id, marcha_id, tipo, atacante_id, defensor_id, origem_id, territorio_id,
                            vencedor, conquistou, dados)
    values (${m.temporada_id}, ${m.id}, ${tipo}, ${m.jogador_id}, ${destino.dono_id}, ${m.origem_id}, ${destino.id},
            ${batalha.vencedor}, ${conquistou},
            ${tx.json({
              terreno: destino.terreno,
              cidadePrincipal: destino.cidade_principal,
              muralha: defensor && destino.cidade_principal ? defensor.estado.predios.muralha : 0,
              forcaAtaque: batalha.forcaAtaque,
              forcaDefesa: batalha.forcaDefesa,
              margem: Number.isFinite(batalha.margem) ? batalha.margem : null,
              atacante: atacanteDaMarcha,
              defensor: exercitoDefensor,
              perdasAtacante: batalha.perdasAtacante,
              perdasDefensor: batalha.perdasDefensor,
              saque,
            })})`;
}

/**
 * Batedor chega: anota as tropas que defendem o território (de qualquer dono), o terreno e a muralha.
 * O jogador só vê o relatório quando o batedor volta (disponivel_em), e uma marcha vazia de volta
 * desenha o caminho no mapa.
 */
async function resolverReconhecimento(tx: Transacao, m: Marcha, agora: number) {
  const [destino] = await tx<Territorio[]>`select id, dono_id, cidade_principal, terreno, x, y from territorios where id = ${m.destino_id}`;
  const [casa] = await tx<{ x: number; y: number }[]>`select x, y from territorios where id = ${m.origem_id}`;
  const [vistas] = await tx<{ lanceiro: number; arqueiro: number; cavalaria: number }[]>`
    select coalesce(sum(lanceiro), 0)::int as lanceiro, coalesce(sum(arqueiro), 0)::int as arqueiro,
           coalesce(sum(cavalaria), 0)::int as cavalaria
      from tropas where territorio_id = ${m.destino_id}`;
  const [muralha] = destino!.cidade_principal
    ? await tx<{ nivel: number }[]>`
        select p.nivel from predios p join cidades c on c.id = p.cidade_id
         where c.temporada_id = ${m.temporada_id} and c.territorio_id = ${destino!.id} and p.tipo = 'muralha'`
    : [];
  const volta = duracaoReconhecimentoMs(destino!, casa!);

  await tx`
    insert into reconhecimentos (temporada_id, jogador_id, territorio_id, dono_id, terreno, muralha,
                                 lanceiro, arqueiro, cavalaria, observado_em, disponivel_em)
    values (${m.temporada_id}, ${m.jogador_id}, ${destino!.id}, ${destino!.dono_id}, ${destino!.terreno}, ${muralha?.nivel ?? 0},
            ${vistas!.lanceiro}, ${vistas!.arqueiro}, ${vistas!.cavalaria}, ${new Date(agora)}, ${new Date(agora + volta)})`;
  await tx`
    insert into marchas (temporada_id, jogador_id, origem_id, destino_id, tipo, partida_em, chegada_em)
    values (${m.temporada_id}, ${m.jogador_id}, ${destino!.id}, ${m.origem_id}, 'retorno', ${new Date(agora)}, ${new Date(agora + volta)})`;
  await concluir(tx, m.id);
}

/** Tropas chegam em casa: entram no território de origem (se ainda for do jogador) ou na cidade, com o saque. */
async function resolverRetorno(tx: Transacao, m: Marcha, agora: number) {
  const c = avancarAteAgora(await carregarCidade(tx, m.temporada_id, m.jogador_id), agora);
  const [casa] = await tx<{ dono_id: string | null }[]>`select dono_id from territorios where id = ${m.destino_id}`;
  const destino = casa?.dono_id === m.jogador_id ? m.destino_id : c.carregada.territorioId;
  if (destino) {
    const grupo = grupoEm(c, destino);
    grupo.tropas = somarExercitos(grupo.tropas, tropasDa(m));
  }
  const saque = { comida: m.saque_comida, madeira: m.saque_madeira, ouro: m.saque_ouro };
  c.estado = { ...c.estado, recursos: receberSaque(c.estado.recursos, saque, c.estado.predios.armazem) };
  await salvarCidade(tx, c);
  await concluir(tx, m.id);
}

async function resolverMarcha(id: string): Promise<boolean> {
  return await sql.begin(async (tx) => {
    const [m] = await tx<Marcha[]>`
      select id, temporada_id, jogador_id, origem_id, destino_id, tipo, lanceiro, arqueiro, cavalaria,
             saque_comida, saque_madeira, saque_ouro
        from marchas where id = ${id} and status = 'a_caminho' and chegada_em <= now()
         for update skip locked`;
    if (!m) return false;
    const agora = Date.now();
    // Retorno e movimento: as tropas chegam a um território próprio (ou à cidade, se ele foi perdido).
    if (m.tipo === 'retorno' || m.tipo === 'movimento') await resolverRetorno(tx, m, agora);
    else if (m.tipo === 'reconhecimento') await resolverReconhecimento(tx, m, agora);
    else await resolverAtaque(tx, m, agora);
    return true;
  });
}

Deno.serve(async (req) => {
  const segredo = Deno.env.get('SEGREDO_CRON');
  if (!segredo || req.headers.get('x-segredo-cron') !== segredo) return resposta(401, { erro: 'Não autorizado.' });

  const pendentes = await sql<{ id: string }[]>`
    select m.id from marchas m join temporadas t on t.id = m.temporada_id and t.status = 'ativa'
     where m.status = 'a_caminho' and m.chegada_em <= now() order by m.chegada_em limit 50`;
  let resolvidas = 0;
  const erros: string[] = [];
  for (const { id } of pendentes) {
    try {
      if (await resolverMarcha(id)) resolvidas++;
    } catch (erro) {
      console.error('marcha', id, erro);
      erros.push(id);
    }
  }
  // Depois das batalhas: placar, objetivos e, se for o caso, fim da temporada.
  let encerrada = false;
  try {
    encerrada = (await sql.begin((tx) => atualizarPlacar(tx))).encerrada;
  } catch (erro) {
    console.error('placar', erro);
    erros.push('placar');
  }
  return resposta(200, { resolvidas, erros, encerrada });
});
