import type { Session } from '@supabase/supabase-js';
import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import AvisoInstalar from '../componentes/AvisoInstalar';
import IndicadorEscudo from '../componentes/IndicadorEscudo';
import NavegacaoInferior, { ABAS, type Aba } from '../componentes/NavegacaoInferior';
import { buscarSalas, definirSalaEscolhida, salaPedida, type Sala } from '../lib/salas';
import { supabase } from '../lib/supabase';
import { buscarMarchasVistas } from '../lib/useMapa';
import { contarCartasNaoLidas } from '../lib/useCartas';
import { contarNaoLidos } from '../lib/useRelatorios';
import Cartas from './Cartas';
import Cidade from './Cidade';
import FimDeTemporada from './FimDeTemporada';
import Fundacao from './Fundacao';
import Objetivo from './Objetivo';
import Perfil from './Perfil';
import Feedback from './Feedback';
import Loja from './Loja';
import Regras from './Regras';
import Relatorios from './Relatorios';
import Salas from './Salas';

// O Phaser (cerca de 1 MB) só é baixado quando o jogador abre o mapa.
const Mapa = lazy(() => import('./Mapa'));

function abaDoEndereco(): Aba {
  if (location.hash === '#mapa') return 'mapa';
  if (location.hash === '#relatorios') return 'relatorios';
  if (location.hash === '#objetivo') return 'objetivo';
  if (location.hash === '#regras') return 'regras';
  if (location.hash === '#loja') return 'loja';
  if (location.hash === '#salas') return 'salas';
  if (location.hash.startsWith('#feedback')) return 'feedback';
  if (location.hash.startsWith('#perfil')) return 'perfil';
  if (location.hash.startsWith('#cartas')) return 'cartas';
  return 'cidade';
}

/** `#cartas=<id>` abre a aba Cartas com uma carta para esse jogador. */
function cartaParaDoEndereco(): string | null {
  return location.hash.startsWith('#cartas=') ? decodeURIComponent(location.hash.slice('#cartas='.length)) : null;
}

/** `#feedback=<numero>` abre a aba Feedback com esse relato aberto. */
function reporteDoEndereco(): number | null {
  const n = location.hash.startsWith('#feedback=') ? Number(location.hash.slice('#feedback='.length)) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** `#perfil=<id>` abre o perfil de outro jogador; `#perfil`, o próprio (null). */
function perfilDoEndereco(): string | null {
  return location.hash.startsWith('#perfil=') ? decodeURIComponent(location.hash.slice('#perfil='.length)) : null;
}

/** Moldura do jogo logado: cabeçalho, abas (topo no desktop, barra inferior no celular) e a tela ativa. */
export default function Jogo({ sessao }: { sessao: Session }) {
  const [aba, setAba] = useState<Aba>(abaDoEndereco);
  const [nome, setNome] = useState<string | null>(null);
  const [perfilDe, setPerfilDe] = useState<string | null>(perfilDoEndereco);
  const [cartaPara, setCartaPara] = useState<string | null>(cartaParaDoEndereco);
  const [reporteAberto, setReporteAberto] = useState<number | null>(reporteDoEndereco);
  // Aba de onde o jogador foi para o Feedback (vai junto no relato de bug).
  const [abaAnterior, setAbaAnterior] = useState<Aba>('cidade');
  // undefined = carregando; null = nenhuma temporada ativa (mostra o fim da última).
  const [temporada, setTemporada] = useState<number | null | undefined>(undefined);
  const [temporadaId, setTemporadaId] = useState<string | null>(null);
  // undefined = carregando; false = ainda não fundou a cidade nesta temporada (mostra a crônica e a fundação).
  const [fundada, setFundada] = useState<boolean | undefined>(undefined);
  // Vencedor da temporada anterior: o herdeiro do trono caído.
  const [herdeiroId, setHerdeiroId] = useState<string | null>(null);
  // Fim do escudo do próprio jogador (null = sem escudo).
  const [escudoAte, setEscudoAte] = useState<number | null>(null);
  const [naoLidos, setNaoLidos] = useState(0);
  const [cartasNaoLidas, setCartasNaoLidas] = useState(0);
  // Marchas inimigas que as torres do jogador avistam (aviso vermelho na aba Mapa).
  const [ameacas, setAmeacas] = useState(0);
  // Salas (partidas em paralelo) e a aberta agora. undefined = carregando.
  const [salas, setSalas] = useState<Sala[] | undefined>(undefined);
  const [sala, setSala] = useState<Sala | null>(null);
  const [organizador, setOrganizador] = useState(false);
  // A sala a abrir na próxima carga (a do endereço ou do aparelho na primeira; depois, a escolhida no menu).
  const [salaInicial] = useState(salaPedida);
  const salaQuerida = useRef<string | null>(salaInicial);

  // Aviso de relatórios novos: confere ao trocar de aba e a cada minuto (as batalhas são resolvidas de minuto em minuto).
  useEffect(() => {
    if (aba === 'relatorios') {
      setNaoLidos(0);
      return;
    }
    const conferir = () => void contarNaoLidos(sessao.user.id).then(setNaoLidos);
    conferir();
    const t = setInterval(conferir, 60_000);
    return () => clearInterval(t);
  }, [aba, sessao.user.id, temporadaId]);

  // Cartas que chegaram e respostas a propostas: confere ao trocar de aba e a cada minuto (pombos chegam a qualquer hora).
  useEffect(() => {
    if (aba === 'cartas') {
      setCartasNaoLidas(0);
      return;
    }
    const conferir = () => void contarCartasNaoLidas(sessao.user.id).then(setCartasNaoLidas);
    conferir();
    const t = setInterval(conferir, 60_000);
    return () => clearInterval(t);
  }, [aba, sessao.user.id, temporadaId]);

  useEffect(() => {
    const conferir = () => void buscarMarchasVistas().then((m) => setAmeacas(m.length));
    conferir();
    const t = setInterval(conferir, 60_000);
    return () => clearInterval(t);
  }, [aba, sessao.user.id, temporadaId]);

  // O escudo nasce numa defesa perdida e some ao atacar: confere ao trocar de aba e a cada minuto.
  useEffect(() => {
    setEscudoAte(null);
    if (!temporadaId) return;
    const conferir = () =>
      void supabase
        ?.from('protecoes')
        .select('ate')
        .eq('temporada_id', temporadaId)
        .eq('jogador_id', sessao.user.id)
        .eq('tipo', 'escudo')
        .maybeSingle<{ ate: string }>()
        .then(({ data }) => setEscudoAte(data ? Date.parse(data.ate) : null));
    conferir();
    const t = setInterval(conferir, 60_000);
    return () => clearInterval(t);
  }, [aba, sessao.user.id, temporadaId]);

  useEffect(() => {
    const aoMudarEndereco = () => {
      setAba(abaDoEndereco());
      setPerfilDe(perfilDoEndereco());
      setCartaPara(cartaParaDoEndereco());
      setReporteAberto(reporteDoEndereco());
    };
    addEventListener('hashchange', aoMudarEndereco);
    return () => removeEventListener('hashchange', aoMudarEndereco);
  }, []);

  const carregarEntrada = useCallback(async () => {
    if (!supabase) return;
    const [jogador, lista, org] = await Promise.all([
      supabase.from('jogadores').select('nome').eq('id', sessao.user.id).maybeSingle<{ nome: string }>(),
      buscarSalas(sessao.user.id),
      supabase.rpc('sou_organizador'),
    ]);
    setNome(jogador.data?.nome ?? null);
    const souOrganizador = org.data === true;
    setOrganizador(souOrganizador);
    // Sala só para convidados não aparece para quem não foi chamado (a sala de teste do organizador, por exemplo).
    const visiveis = lista.filter((s) => s.acesso === 'aberta' || s.convidado || s.minhaCidade || souOrganizador);
    setSalas(visiveis);
    // A sala pedida, se ainda existe; senão a principal (a primeira da lista).
    const escolhida = visiveis.find((s) => s.id === salaQuerida.current) ?? visiveis[0] ?? null;
    if (escolhida) definirSalaEscolhida(escolhida);
    salaQuerida.current = escolhida?.id ?? null;
    setSala(escolhida);
    const ativa = escolhida?.temporada?.status === 'ativa' ? escolhida.temporada : null;
    setHerdeiroId(escolhida?.herdeiroId ?? null);
    setFundada(escolhida?.minhaCidade ?? false);
    setTemporada(ativa?.numero ?? null);
    setTemporadaId(ativa?.id ?? null);
  }, [sessao.user.id]);

  /** Abre outra sala: a tela recarrega tudo da temporada dela (cidade, mapa, placar, cartas). */
  const abrirSala = useCallback(
    async (id: string) => {
      salaQuerida.current = id;
      setNaoLidos(0);
      setCartasNaoLidas(0);
      setAmeacas(0);
      await carregarEntrada();
      location.hash = 'cidade';
      setAba('cidade');
    },
    [carregarEntrada],
  );

  useEffect(() => {
    void carregarEntrada();
  }, [carregarEntrada]);

  function irPara(nova: Aba) {
    if (nova === 'feedback' && aba !== 'feedback') setAbaAnterior(aba);
    location.hash = nova;
    setAba(nova);
    setPerfilDe(null);
    setCartaPara(null);
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-10 border-b border-couro bg-noite/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <img src="/escudo.svg" alt="" className="size-8" />
            <div>
              <h1 className="font-titulo text-lg leading-tight text-ouro">
                {nome === null ? (
                  'Terra de Ninguém'
                ) : (
                  <button
                    onClick={() => irPara('perfil')}
                    title="Seu perfil"
                    className="rounded text-left hover:text-ouro-claro focus-visible:outline-2 focus-visible:outline-ouro"
                  >
                    {nome}
                  </button>
                )}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2 text-xs text-pergaminho-escuro">
                {sala && (salas?.length ?? 0) > 1 && <span className="text-pergaminho">{sala.nome} ·</span>}
                {temporada ? `Temporada ${temporada}` : ' '}
                {temporada && escudoAte !== null && <IndicadorEscudo ate={escudoAte} />}
              </p>
            </div>
          </div>
          <nav className={`gap-1 ${temporada === null || !fundada ? 'hidden' : 'hidden md:flex'}`}>
            {ABAS.map((item) => (
              <button
                key={item.id}
                onClick={() => irPara(item.id)}
                className={`rounded-lg px-3 py-1.5 text-sm ${item.id === aba ? 'bg-couro text-ouro' : 'text-pergaminho-escuro hover:text-pergaminho'}`}
              >
                {item.icone} {item.rotulo}
                {item.id === 'relatorios' && naoLidos > 0 && (
                  <span className="ml-1.5 rounded-full bg-sangue px-1.5 text-[11px] font-bold text-pergaminho">{naoLidos}</span>
                )}
                {item.id === 'cartas' && cartasNaoLidas > 0 && (
                  <span className="ml-1.5 rounded-full bg-sangue px-1.5 text-[11px] font-bold text-pergaminho">{cartasNaoLidas}</span>
                )}
                {item.id === 'mapa' && ameacas > 0 && (
                  <span className="ml-1.5 rounded-full bg-sangue px-1.5 text-[11px] font-bold text-pergaminho">⚠️ {ameacas}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {((salas?.length ?? 0) > 1 || organizador) && (
              <button
                onClick={() => irPara('salas')}
                aria-current={aba === 'salas' ? 'page' : undefined}
                title="Salas: partidas em paralelo"
                className={`rounded-lg border px-3 py-1.5 text-sm ${aba === 'salas' ? 'border-ouro text-ouro' : 'border-couro text-pergaminho-escuro hover:text-pergaminho'}`}
              >
                🏰<span className="hidden sm:inline"> Salas</span>
              </button>
            )}
            <button
              onClick={() => irPara('feedback')}
              aria-current={aba === 'feedback' ? 'page' : undefined}
              title="Relatar bug ou sugerir ideia"
              className={`rounded-lg border px-3 py-1.5 text-sm ${aba === 'feedback' ? 'border-ouro text-ouro' : 'border-couro text-pergaminho-escuro hover:text-pergaminho'}`}
            >
              💬<span className="hidden sm:inline"> Feedback</span>
            </button>
            <button
              onClick={() => irPara('loja')}
              aria-current={aba === 'loja' ? 'page' : undefined}
              title="Loja de gemas"
              className={`rounded-lg border px-3 py-1.5 text-sm ${aba === 'loja' ? 'border-ouro text-ouro' : 'border-couro text-pergaminho-escuro hover:text-pergaminho'}`}
            >
              💎<span className="hidden sm:inline"> Loja</span>
            </button>
            <button
              onClick={() => irPara('regras')}
              aria-current={aba === 'regras' ? 'page' : undefined}
              className={`rounded-lg border px-3 py-1.5 text-sm ${aba === 'regras' ? 'border-ouro text-ouro' : 'border-couro text-pergaminho-escuro hover:text-pergaminho'}`}
            >
              📖<span className="hidden sm:inline"> Regras</span>
            </button>
            <button
              onClick={() => supabase?.auth.signOut()}
              className="rounded-lg border border-couro px-3 py-1.5 text-sm text-pergaminho-escuro hover:text-pergaminho"
            >
              Sair
            </button>
          </div>
        </div>
      </header>
      <AvisoInstalar />

      {/* Só o mapa tem rolagem própria. Com a aba Mapa no endereço, a fundação e o fim de temporada aparecem no lugar
          dele e precisam rolar. O `relative` prende aqui dentro os elementos `absolute` sem pai posicionado (como o
          `sr-only` do arauto na Loja): sem ele, a página inteira ganhava rolagem e a barra de baixo subia. */}
      {/* A chave é a sala: trocar de sala remonta as telas, que releem tudo da temporada dela. */}
      <main key={sala?.id ?? 'sem-sala'} className={`relative min-h-0 flex-1 ${aba === 'mapa' && temporada && fundada ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {aba === 'salas' ? (
          <Salas
            meuId={sessao.user.id}
            salas={salas ?? []}
            salaAberta={sala?.id ?? null}
            organizador={organizador}
            onAbrir={(id) => void abrirSala(id)}
            onMudou={() => void carregarEntrada()}
          />
        ) : aba === 'regras' ? (
          <Regras />
        ) : aba === 'loja' ? (
          <Loja />
        ) : aba === 'feedback' ? (
          <Feedback meuId={sessao.user.id} numeroAberto={reporteAberto} abaDeOrigem={abaAnterior} />
        ) : aba === 'perfil' ? (
          <Perfil jogadorId={perfilDe ?? sessao.user.id} meuId={sessao.user.id} onNomeMudou={setNome} />
        ) : temporada === undefined ? null : temporada === null ? (
          <FimDeTemporada sessao={sessao} />
        ) : fundada === undefined ? null : !fundada ? (
          <Fundacao
            key={sala?.id}
            temporada={temporada}
            sala={sala && !sala.principal ? sala.nome : null}
            nomeAtual={nome ?? ''}
            herdeiro={herdeiroId === sessao.user.id}
            onFundada={() => void carregarEntrada()}
          />
        ) : aba === 'cidade' ? (
          <Cidade sessao={sessao} />
        ) : aba === 'objetivo' ? (
          <Objetivo sessao={sessao} />
        ) : aba === 'relatorios' ? (
          <Relatorios sessao={sessao} />
        ) : aba === 'cartas' ? (
          <Cartas sessao={sessao} para={cartaPara} />
        ) : (
          <Suspense fallback={<div className="grid h-full place-items-center text-pergaminho-escuro">Abrindo o mapa…</div>}>
            <Mapa sessao={sessao} />
          </Suspense>
        )}
      </main>

      {temporada !== null && fundada && <NavegacaoInferior aba={aba} onMudar={irPara} naoLidos={naoLidos} cartasNaoLidas={cartasNaoLidas} ameacas={ameacas} />}
    </div>
  );
}
