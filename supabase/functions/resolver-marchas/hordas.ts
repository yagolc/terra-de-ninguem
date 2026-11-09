// Hordas bárbaras (regras: packages/regras/src/hordas.ts). Chamado a cada minuto pelo resolver-marchas:
// resolve as hordas que chegaram e solta a próxima quando é a hora. Cada passo numa transação própria.
import {
  bonusDefesaRaca,
  bonusSeDisponivel,
  calcularSaque,
  chegadaDaHorda,
  distribuirPerdas,
  escolherAlvoDaHorda,
  exercito,
  exercitoDaHorda,
  feridoAte,
  geradorComSemente,
  mapearExercito,
  origemDaHorda,
  proximaHordaEm,
  receberSaque,
  recompensaDaHorda,
  recursos,
  resolverBatalha,
  sementeDeTexto,
  somarExercitos,
  sortearSorte,
  subtrairRecursos,
  totalUnidades,
  type Terreno,
  type TipoPovoado,
} from '../../../packages/regras/src/index.ts';
import { avancarAteAgora, carregarCidade, grupoEm, salvarCidade } from '../_compartilhado/cidade.ts';
import { sql, type Transacao } from '../_compartilhado/db.ts';
import { posicionarHeroi } from '../_compartilhado/herois.ts';

type Horda = {
  id: string;
  temporada_id: string;
  numero: number;
  territorio_id: string;
  lanceiro: number;
  arqueiro: number;
  cavalaria: number;
};

/** Solta a próxima horda da temporada ativa, se já é a hora (a primeira no fim da proteção de iniciante). */
export async function soltarHordaSeForHora(tx: Transacao, agora: number): Promise<boolean> {
  const [temporada] = await tx<{ id: string; inicio: Date }[]>`
    select id, inicio from temporadas where status = 'ativa' for update`;
  if (!temporada) return false;
  const [ultima] = await tx<{ numero: number; partida_em: Date }[]>`
    select numero, partida_em from hordas where temporada_id = ${temporada.id} order by numero desc limit 1`;
  if (agora < proximaHordaEm(temporada.inicio.getTime(), ultima?.partida_em.getTime() ?? null)) return false;

  const numero = (ultima?.numero ?? 0) + 1;
  const aleatorio = geradorComSemente(sementeDeTexto(`${temporada.id}:horda:${numero}`));
  const placar = await tx<{ jogador_id: string; pontos: number; territorios: number }[]>`
    select jogador_id, pontos, territorios from placar where temporada_id = ${temporada.id}`;
  const territorios = await tx<{ id: string; dono_id: string | null; x: number; y: number; poligono: [number, number][] }[]>`
    select id, dono_id, x, y, poligono from territorios where temporada_id = ${temporada.id}`;
  const territoriosDe = new Map<string, string[]>();
  for (const t of territorios) {
    if (t.dono_id) territoriosDe.set(t.dono_id, [...(territoriosDe.get(t.dono_id) ?? []), t.id]);
  }
  const alvo = escolherAlvoDaHorda({
    placar: placar.map((p) => ({ jogadorId: p.jogador_id, pontos: p.pontos, territorios: p.territorios })),
    territoriosDe,
    aleatorio,
  });
  if (!alvo) return false;

  const destino = territorios.find((t) => t.id === alvo.territorioId)!;
  const pontos = territorios.flatMap((t) => t.poligono);
  const origem = origemDaHorda(destino, {
    largura: Math.max(...pontos.map(([x]) => x)),
    altura: Math.max(...pontos.map(([, y]) => y)),
  });
  const tropas = exercitoDaHorda(numero, aleatorio);
  await tx`
    insert into hordas (temporada_id, numero, territorio_id, alvo_id, lanceiro, arqueiro, cavalaria, origem_x, origem_y,
                        partida_em, chegada_em)
    values (${temporada.id}, ${numero}, ${destino.id}, ${alvo.jogadorId}, ${tropas.lanceiro}, ${tropas.arqueiro}, ${tropas.cavalaria},
            ${origem.x}, ${origem.y}, ${new Date(agora)}, ${new Date(chegadaDaHorda(agora))})
    on conflict (temporada_id, numero) do nothing`;
  return true;
}

/**
 * A horda chega e luta contra quem estiver no território (dono, milícia, Guarda Real, herói castelão, muralha,
 * paliçada, raça). Defendeu: o dono ganha ouro. Perdeu na cidade: a horda saqueia e vai embora. Perdeu num
 * território comum com folga para conquistar: ele vira neutro, com a horda de guarda.
 */
export async function resolverHorda(id: string): Promise<boolean> {
  return await sql.begin(async (tx) => {
    const [h] = await tx<Horda[]>`
      select id, temporada_id, numero, territorio_id, lanceiro, arqueiro, cavalaria from hordas
       where id = ${id} and status = 'a_caminho' and chegada_em <= now()
         for update skip locked`;
    if (!h) return false;
    const agora = Date.now();
    const horda = exercito({ lanceiro: h.lanceiro, arqueiro: h.arqueiro, cavalaria: h.cavalaria });
    const [destino] = await tx<{ id: string; dono_id: string | null; cidade_principal: boolean; terreno: Terreno }[]>`
      select id, dono_id, cidade_principal, terreno from territorios where id = ${h.territorio_id} for update`;

    // O território virou neutro antes de ela chegar: os bárbaros não brigam entre si, a horda se dispersa.
    if (!destino?.dono_id) {
      await tx`update hordas set status = 'resolvida', resultado = ${tx.json({ dispersou: true })} where id = ${h.id}`;
      return true;
    }

    const defensor = avancarAteAgora(await carregarCidade(tx, h.temporada_id, destino.dono_id), agora);
    const heroiDefensor = defensor.carregada.heroi?.territorioId === destino.id ? defensor.carregada.heroi : null;
    const [povoado] = await tx<{ id: string; tipo: TipoPovoado; milicia: number }[]>`
      select id, tipo, milicia from povoados where territorio_id = ${destino.id} for update`;
    const cidadeLivre = povoado?.tipo === 'cidade_livre';
    const guardaReal = destino.cidade_principal ? defensor.carregada.guardaReal : 0;
    const miliciaDefendendo = exercito({ lanceiro: (cidadeLivre ? povoado.milicia : 0) + guardaReal });
    const grupo = grupoEm(defensor, destino.id);
    const [comPalicada] = await tx`
      select 1 from estruturas where territorio_id = ${destino.id} and tipo = 'palicada' and pronto_em <= ${new Date(agora)}`;

    const batalha = resolverBatalha({
      atacante: horda,
      defensor: somarExercitos(grupo.tropas, miliciaDefendendo),
      terreno: destino.terreno,
      nivelMuralha: destino.cidade_principal ? defensor.estado.predios.muralha : 0,
      palicada: !!comPalicada,
      cidadeLivre,
      bonusDefesa: bonusSeDisponivel(heroiDefensor, 'castelao', agora) + bonusDefesaRaca(defensor.carregada.raca, destino.terreno),
      sorte: sortearSorte(geradorComSemente(sementeDeTexto(h.id))),
      alvoCidadePrincipal: destino.cidade_principal,
    });
    const hordaVenceu = batalha.vencedor === 'atacante';
    const conquistou = hordaVenceu && !destino.cidade_principal && batalha.permiteConquista;
    const [perdasDono, perdasMilicia] = distribuirPerdas([grupo.tropas, miliciaDefendendo], batalha.perdasDefensor);
    const sobreviventesDono = mapearExercito((t) => grupo.tropas[t] - perdasDono![t]);
    const miliciaDepois = miliciaDefendendo.lanceiro - perdasMilicia!.lanceiro;

    let ouro = 0;
    let saque = recursos();
    if (!hordaVenceu) {
      ouro = recompensaDaHorda(h.numero);
      defensor.estado = {
        ...defensor.estado,
        recursos: receberSaque(defensor.estado.recursos, recursos({ ouro }), defensor.estado.predios.armazem),
      };
    } else if (destino.cidade_principal) {
      saque = calcularSaque({
        estoque: defensor.estado.recursos,
        nivelArmazem: defensor.estado.predios.armazem,
        sobreviventes: batalha.sobreviventesAtacante,
      });
      defensor.estado = { ...defensor.estado, recursos: subtrairRecursos(defensor.estado.recursos, saque) };
    }

    if (conquistou) {
      // O território volta a ser neutro, com a horda de guarda; quem sobrou do dono recua para a cidade dele.
      await tx`update territorios set dono_id = null where id = ${destino.id}`;
      await tx`delete from estruturas where territorio_id = ${destino.id}`;
      await tx`delete from estradas where territorio_id = ${destino.id}`;
      grupo.tropas = exercito();
      if (defensor.carregada.territorioId) {
        const casa = grupoEm(defensor, defensor.carregada.territorioId);
        casa.tropas = somarExercitos(casa.tropas, sobreviventesDono);
      }
      const s = batalha.sobreviventesAtacante;
      if (totalUnidades(s) > 0) {
        await tx`
          insert into tropas (temporada_id, territorio_id, dono_id, lanceiro, arqueiro, cavalaria)
          values (${h.temporada_id}, ${destino.id}, null, ${s.lanceiro}, ${s.arqueiro}, ${s.cavalaria})`;
      }
      if (povoado) {
        await tx`update povoados set posse_desde = null, leal_desde = null, milicia = 0 where id = ${povoado.id}`;
      }
    } else {
      grupo.tropas = sobreviventesDono;
      if (povoado && cidadeLivre && miliciaDepois !== miliciaDefendendo.lanceiro) {
        await tx`update povoados set milicia = ${miliciaDepois} where id = ${povoado.id}`;
      }
      if (guardaReal > 0 && miliciaDepois !== guardaReal) {
        await tx`update cidades set guarda_real = ${miliciaDepois} where id = ${defensor.carregada.id}`;
      }
    }
    if (heroiDefensor && hordaVenceu) {
      await posicionarHeroi(tx, heroiDefensor.id, {
        territorioId: defensor.carregada.territorioId,
        marchaId: null,
        feridoAte: feridoAte(agora),
      });
    }
    await salvarCidade(tx, defensor);

    await tx`
      update hordas
         set status = 'resolvida', defensor_id = ${destino.dono_id}, vencedor = ${hordaVenceu ? 'horda' : 'defensor'},
             conquistou = ${conquistou},
             resultado = ${tx.json({
               cidadePrincipal: destino.cidade_principal,
               ouro,
               saque,
               perdasHorda: batalha.perdasAtacante,
               sobreviventesHorda: batalha.sobreviventesAtacante,
             })}
       where id = ${h.id}`;
    return true;
  });
}

/** Resolve as hordas que já chegaram e solta a próxima, se for a hora. */
export async function cuidarDasHordas(erros: string[]): Promise<void> {
  const pendentes = await sql<{ id: string }[]>`
    select h.id from hordas h join temporadas t on t.id = h.temporada_id and t.status = 'ativa'
     where h.status = 'a_caminho' and h.chegada_em <= now() order by h.chegada_em limit 10`;
  for (const { id } of pendentes) {
    try {
      await resolverHorda(id);
    } catch (erro) {
      console.error('horda', id, erro);
      erros.push(`horda ${id}`);
    }
  }
  try {
    await sql.begin((tx) => soltarHordaSeForHora(tx, Date.now()));
  } catch (erro) {
    console.error('soltar horda', erro);
    erros.push('soltar horda');
  }
}
