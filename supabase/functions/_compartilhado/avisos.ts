// Avisos no celular (notificações push). A cada minuto, o resolver-marchas chama `avisarJogadores`: numa transação,
// marca o que ainda não foi avisado (relatórios, marchas vistas pela torre, cartas, respostas, hordas e o relógio do
// objetivo) e monta os avisos; depois da transação, manda para os aparelhos inscritos de cada jogador que querem
// aquele tipo. Push é "melhor esforço": se o serviço do navegador falhar, o aviso se perde (o jogo continua igual).
// Chaves VAPID nos segredos das funções (VAPID_PUBLICA, VAPID_PRIVADA), nunca no git; a pública também vai no site.
import webpush from 'npm:web-push@3.6.7';
import { BALANCEAMENTO, relogioDoObjetivo, type TipoAviso, type TipoProposta } from '../../../packages/regras/src/index.ts';
import { sql, type Transacao } from './db.ts';

/** O que aparece na notificação: título, texto, aba que abre ao tocar e `tag` (avisos com a mesma tag se substituem). */
export type Aviso = { jogadorId: string; tipo: TipoAviso; titulo: string; corpo: string; url: string; tag: string };
type Inscricao = { id: string; jogador_id: string; endpoint: string; p256dh: string; auth: string; tipos: string[] };

const SITE = 'https://terra-de-ninguem.vercel.app';
// Notificação que demora mais que isso para chegar (celular desligado) não vale mais a pena.
const VALIDADE_S = 6 * 3600;

const hora = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
const quando = (d: Date | number) => hora.format(d instanceof Date ? d : new Date(d));
const resumo = (texto: string, max = 120) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);
const NOME_PROPOSTA: Record<TipoProposta, string> = { nao_agressao: 'pacto de não agressão', acesso_militar: 'acesso militar' };

let vapidPronto: boolean | null = null;
function prepararVapid(): boolean {
  if (vapidPronto !== null) return vapidPronto;
  const publica = Deno.env.get('VAPID_PUBLICA');
  const privada = Deno.env.get('VAPID_PRIVADA');
  vapidPronto = !!publica && !!privada;
  if (vapidPronto) webpush.setVapidDetails(SITE, publica!, privada!);
  else console.error('avisos: faltam os segredos VAPID_PUBLICA e VAPID_PRIVADA');
  return vapidPronto;
}

/** Marca o que ainda não foi avisado e devolve os avisos a mandar (dentro de uma transação). */
export async function coletarAvisos(tx: Transacao, agora: number): Promise<Aviso[]> {
  const avisos: Aviso[] = [];

  // Batalhas e marchas devolvidas: para o atacante e, se for jogador, o defensor.
  const relatorios = await tx<
    {
      id: string;
      tipo: string;
      atacante_id: string;
      defensor_id: string | null;
      vencedor: 'atacante' | 'defensor' | null;
      conquistou: boolean;
      motivo: string | null;
      territorio: string;
      atacante: string;
    }[]
  >`
    update relatorios r set avisado = true
      from territorios t
     where r.id in (select id from relatorios where not avisado order by criado_em limit 200 for update skip locked)
       and t.id = r.territorio_id
    returning r.id, r.tipo, r.atacante_id, r.defensor_id, r.vencedor, r.conquistou, r.dados->>'motivo' as motivo,
              t.nome as territorio, (select nome from jogadores where id = r.atacante_id) as atacante`;
  for (const r of relatorios) {
    const base = { tipo: 'batalha' as const, url: '/#relatorios', tag: `relatorio-${r.id}` };
    if (r.vencedor === null) {
      avisos.push({
        ...base,
        jogadorId: r.atacante_id,
        titulo: `↩️ Tropas voltaram de ${r.territorio}`,
        corpo: r.motivo === 'pacto' ? 'Há um pacto de não agressão com o dono: voltaram sem lutar.' : 'O dono está protegido: voltaram sem lutar.',
      });
      continue;
    }
    const venceu = r.vencedor === 'atacante';
    avisos.push({
      ...base,
      jogadorId: r.atacante_id,
      titulo: `${venceu ? '🏆 Vitória' : '💀 Derrota'} em ${r.territorio}`,
      corpo: venceu
        ? r.conquistou
          ? 'O território agora é seu.'
          : r.tipo === 'saque'
            ? 'Saque feito: as tropas voltam com o que levaram.'
            : 'Os defensores caíram, mas faltou folga para conquistar.'
        : 'Suas tropas foram derrotadas.',
    });
    if (r.defensor_id) {
      avisos.push({
        ...base,
        jogadorId: r.defensor_id,
        titulo: `⚔️ ${r.atacante} atacou ${r.territorio}`,
        corpo: !venceu ? 'Você defendeu.' : r.conquistou ? 'Você perdeu o território.' : 'Seus defensores perderam.',
      });
    }
  }

  // Marchas alheias rumo a um território com torre pronta do dono: a torre avisa (como o ⚠️ do mapa).
  const vistas = await tx<
    { id: string; tipo: string; dono_id: string; territorio: string; soldados: number; chegada_em: Date; atacante: string }[]
  >`
    update marchas m set avisada_torre = true
      from territorios t, estruturas e
     where m.status = 'a_caminho' and not m.avisada_torre and m.tipo in ('saque', 'conquista', 'reconhecimento')
       and t.id = m.destino_id and t.dono_id is not null and t.dono_id <> m.jogador_id
       and e.territorio_id = m.destino_id and e.jogador_id = t.dono_id and e.tipo = 'torre' and e.pronto_em <= now()
    returning m.id, m.tipo, t.dono_id, t.nome as territorio, (m.lanceiro + m.arqueiro + m.cavalaria)::int as soldados,
              m.chegada_em, (select nome from jogadores where id = m.jogador_id) as atacante`;
  for (const m of vistas) {
    avisos.push({
      jogadorId: m.dono_id,
      tipo: 'ataque',
      titulo: m.tipo === 'reconhecimento' ? `🔭 Batedor vindo para ${m.territorio}` : `🗼 Tropas vindo para ${m.territorio}`,
      corpo:
        m.tipo === 'reconhecimento'
          ? `Um batedor de ${m.atacante} chega ${quando(m.chegada_em)}.`
          : `${m.soldados} soldados de ${m.atacante} chegam ${quando(m.chegada_em)}.`,
      url: '/#mapa',
      tag: `marcha-${m.id}`,
    });
  }

  // Cartas que chegaram.
  const cartas = await tx<
    { id: string; destinatario_id: string; texto: string; proposta: TipoProposta | null; horas_pacto: number | null; remetente: string }[]
  >`
    update cartas c set avisada = true
     where not c.avisada and c.chega_em <= now()
    returning c.id, c.destinatario_id, c.texto, c.proposta, c.horas_pacto,
              (select nome from jogadores where id = c.remetente_id) as remetente`;
  for (const c of cartas) {
    const proposta = c.proposta ? `Proposta de ${NOME_PROPOSTA[c.proposta]} por ${c.horas_pacto} h.` : '';
    avisos.push({
      jogadorId: c.destinatario_id,
      tipo: 'carta',
      titulo: `🕊️ Carta de ${c.remetente}`,
      corpo: [resumo(c.texto), proposta].filter(Boolean).join(' '),
      url: '/#cartas',
      tag: `carta-${c.id}`,
    });
  }

  // Respostas às propostas: para quem mandou.
  const respostas = await tx<
    { id: string; remetente_id: string; resposta: 'aceita' | 'recusada'; proposta: TipoProposta | null; horas_pacto: number | null; destinatario: string }[]
  >`
    update cartas c set resposta_avisada = true
     where c.resposta is not null and not c.resposta_avisada
    returning c.id, c.remetente_id, c.resposta, c.proposta, c.horas_pacto,
              (select nome from jogadores where id = c.destinatario_id) as destinatario`;
  for (const r of respostas) {
    const nome = r.proposta ? NOME_PROPOSTA[r.proposta] : 'proposta';
    avisos.push({
      jogadorId: r.remetente_id,
      tipo: 'carta',
      titulo: r.resposta === 'aceita' ? `🤝 ${r.destinatario} aceitou` : `✋ ${r.destinatario} recusou`,
      corpo: r.resposta === 'aceita' ? `O ${nome} vale por ${r.horas_pacto} h a partir de agora.` : `Recusou o ${nome}.`,
      url: '/#cartas',
      tag: `resposta-${r.id}`,
    });
  }

  // Horda que saiu: para o dono do alvo.
  const hordas = await tx<{ id: string; alvo_id: string | null; territorio: string; chegada_em: Date; guerreiros: number }[]>`
    update hordas h set avisada = true
      from territorios t
     where not h.avisada and t.id = h.territorio_id
    returning h.id, h.alvo_id, t.nome as territorio, h.chegada_em, (h.lanceiro + h.arqueiro + h.cavalaria)::int as guerreiros`;
  for (const h of hordas) {
    if (!h.alvo_id) continue;
    avisos.push({
      jogadorId: h.alvo_id,
      tipo: 'horda',
      titulo: `☠️ Horda bárbara vindo para ${h.territorio}`,
      corpo: `${h.guerreiros} guerreiros chegam ${quando(h.chegada_em)}.`,
      url: '/#mapa',
      tag: `horda-${h.id}`,
    });
  }

  // Horda que atacou: para quem defendeu.
  const ataquesDeHorda = await tx<{ id: string; defensor_id: string | null; vencedor: 'horda' | 'defensor' | null; conquistou: boolean; territorio: string }[]>`
    update hordas h set resultado_avisado = true
      from territorios t
     where h.status = 'resolvida' and not h.resultado_avisado and t.id = h.territorio_id
    returning h.id, h.defensor_id, h.vencedor, h.conquistou, t.nome as territorio`;
  for (const h of ataquesDeHorda) {
    if (!h.defensor_id || !h.vencedor) continue;
    avisos.push({
      jogadorId: h.defensor_id,
      tipo: 'horda',
      titulo: `☠️ A horda atacou ${h.territorio}`,
      corpo: h.vencedor === 'defensor' ? 'Você venceu a horda.' : h.conquistou ? 'A horda venceu e tomou o território.' : 'A horda venceu.',
      url: '/#relatorios',
      tag: `horda-${h.id}`,
    });
  }

  // Relógio do objetivo ligado: para todos da temporada (quem cumpriu recebe o seu).
  const relogios = await tx<{ temporada_id: string; jogador_id: string; objetivo_desde: Date; inicio: Date; nome: string }[]>`
    update placar p set objetivo_avisado = p.objetivo_desde
      from temporadas tp
     where p.objetivo_desde is not null and p.objetivo_avisado is distinct from p.objetivo_desde
       and tp.id = p.temporada_id and tp.status = 'ativa'
    returning p.temporada_id, p.jogador_id, p.objetivo_desde, tp.inicio,
              (select nome from jogadores where id = p.jogador_id) as nome`;
  for (const r of relogios) {
    const venceEm =
      relogioDoObjetivo({ cumprido: true, segurandoDesde: r.objetivo_desde.getTime(), agora, inicioTemporada: r.inicio.getTime() }).venceEm ??
      r.objetivo_desde.getTime() + BALANCEAMENTO.objetivos.segurarHoras * 3600_000;
    const jogadores = await tx<{ jogador_id: string }[]>`select jogador_id from cidades where temporada_id = ${r.temporada_id}`;
    for (const j of jogadores) {
      const eu = j.jogador_id === r.jogador_id;
      avisos.push({
        jogadorId: j.jogador_id,
        tipo: 'objetivo',
        titulo: eu ? '🏆 Você cumpriu seu objetivo!' : `🏆 ${r.nome} cumpriu o objetivo secreto`,
        corpo: eu
          ? `Segure até ${quando(venceEm)} para vencer. Sem escudo nem pactos de não agressão até lá.`
          : `Vence ${quando(venceEm)} se mantiver. Está sem escudo nem pactos: é a hora de reagir.`,
        url: '/#objetivo',
        tag: `objetivo-${r.jogador_id}`,
      });
    }
  }

  return avisos;
}

/** Manda uma notificação para uma inscrição. Devolve o código do serviço de push quando ele recusa. */
async function mandar(inscricao: Inscricao, aviso: Pick<Aviso, 'titulo' | 'corpo' | 'url' | 'tag'> & { urgente: boolean }) {
  try {
    await webpush.sendNotification(
      { endpoint: inscricao.endpoint, keys: { p256dh: inscricao.p256dh, auth: inscricao.auth } },
      JSON.stringify({ titulo: aviso.titulo, corpo: aviso.corpo, url: aviso.url, tag: aviso.tag }),
      { TTL: VALIDADE_S, urgency: aviso.urgente ? 'high' : 'normal' },
    );
    return { ok: true as const };
  } catch (erro) {
    const codigo = (erro as { statusCode?: number }).statusCode ?? 0;
    // 404/410: o aparelho cancelou a inscrição (desinstalou, limpou os dados): sai da lista.
    if (codigo === 404 || codigo === 410) await sql`delete from inscricoes_avisos where id = ${inscricao.id}`;
    else console.error('avisos: envio falhou', codigo, erro);
    return { ok: false as const, codigo };
  }
}

/** Manda cada aviso para os aparelhos do jogador que querem aquele tipo. */
export async function enviarAvisos(avisos: Aviso[]): Promise<number> {
  if (avisos.length === 0 || !prepararVapid()) return 0;
  const jogadores = [...new Set(avisos.map((a) => a.jogadorId))];
  const inscricoes = await sql<Inscricao[]>`
    select id, jogador_id, endpoint, p256dh, auth, tipos from inscricoes_avisos where jogador_id = any(${jogadores}::uuid[])`;
  const envios = avisos.flatMap((a) =>
    inscricoes
      .filter((i) => i.jogador_id === a.jogadorId && i.tipos.includes(a.tipo))
      .map((i) => mandar(i, { ...a, urgente: a.tipo === 'ataque' || a.tipo === 'horda' || a.tipo === 'objetivo' })),
  );
  const resultados = await Promise.all(envios);
  return resultados.filter((r) => r.ok).length;
}

/** Junta e manda os avisos do minuto (chamado pelo resolver-marchas depois das batalhas e do placar). */
export async function avisarJogadores(): Promise<number> {
  const avisos = await sql.begin((tx) => coletarAvisos(tx, Date.now()));
  return await enviarAvisos(avisos);
}

/** Aviso de teste para um aparelho do jogador (botão "Testar" no perfil). Devolve o erro do serviço, se houver. */
export async function testarAviso(jogadorId: string, endpoint: string): Promise<{ ok: boolean; codigo?: number }> {
  if (!prepararVapid()) return { ok: false, codigo: 0 };
  const [inscricao] = await sql<Inscricao[]>`
    select id, jogador_id, endpoint, p256dh, auth, tipos from inscricoes_avisos where jogador_id = ${jogadorId} and endpoint = ${endpoint}`;
  if (!inscricao) return { ok: false, codigo: 404 };
  return await mandar(inscricao, {
    titulo: '🔔 Avisos ligados',
    corpo: 'É assim que o Terra de Ninguém vai te chamar quando algo acontecer.',
    url: '/#perfil',
    tag: 'teste',
    urgente: false,
  });
}
