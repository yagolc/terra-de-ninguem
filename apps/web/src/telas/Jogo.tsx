import type { Session } from '@supabase/supabase-js';
import { Suspense, lazy, useEffect, useState } from 'react';
import NavegacaoInferior, { ABAS, type Aba } from '../componentes/NavegacaoInferior';
import { supabase } from '../lib/supabase';
import { contarNaoLidos } from '../lib/useRelatorios';
import Cidade from './Cidade';
import FimDeTemporada from './FimDeTemporada';
import Objetivo from './Objetivo';
import Regras from './Regras';
import Relatorios from './Relatorios';

// O Phaser (cerca de 1 MB) só é baixado quando o jogador abre o mapa.
const Mapa = lazy(() => import('./Mapa'));

function abaDoEndereco(): Aba {
  if (location.hash === '#mapa') return 'mapa';
  if (location.hash === '#relatorios') return 'relatorios';
  if (location.hash === '#objetivo') return 'objetivo';
  if (location.hash === '#regras') return 'regras';
  return 'cidade';
}

/** Moldura do jogo logado: cabeçalho, abas (topo no desktop, barra inferior no celular) e a tela ativa. */
export default function Jogo({ sessao }: { sessao: Session }) {
  const [aba, setAba] = useState<Aba>(abaDoEndereco);
  const [nome, setNome] = useState<string | null>(null);
  // undefined = carregando; null = nenhuma temporada ativa (mostra o fim da última).
  const [temporada, setTemporada] = useState<number | null | undefined>(undefined);
  const [naoLidos, setNaoLidos] = useState(0);

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
  }, [aba, sessao.user.id]);

  useEffect(() => {
    const aoMudarEndereco = () => setAba(abaDoEndereco());
    addEventListener('hashchange', aoMudarEndereco);
    return () => removeEventListener('hashchange', aoMudarEndereco);
  }, []);

  useEffect(() => {
    supabase
      ?.from('jogadores')
      .select('nome')
      .eq('id', sessao.user.id)
      .maybeSingle<{ nome: string }>()
      .then(({ data }) => setNome(data?.nome ?? null));
    supabase
      ?.from('temporadas')
      .select('numero')
      .eq('status', 'ativa')
      .maybeSingle<{ numero: number }>()
      .then(({ data }) => setTemporada(data?.numero ?? null));
  }, [sessao.user.id]);

  function irPara(nova: Aba) {
    location.hash = nova;
    setAba(nova);
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="z-10 border-b border-couro bg-noite/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <img src="/escudo.svg" alt="" className="size-8" />
            <div>
              <h1 className="font-titulo text-lg leading-tight text-ouro">{nome ?? 'Terra de Ninguém'}</h1>
              <p className="text-xs text-pergaminho-escuro">{temporada ? `Temporada ${temporada}` : ' '}</p>
            </div>
          </div>
          <nav className={`gap-1 ${temporada === null ? 'hidden' : 'hidden md:flex'}`}>
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
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
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

      <main className={`min-h-0 flex-1 ${aba === 'mapa' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {aba === 'regras' ? (
          <Regras />
        ) : temporada === undefined ? null : temporada === null ? (
          <FimDeTemporada sessao={sessao} />
        ) : aba === 'cidade' ? (
          <Cidade sessao={sessao} />
        ) : aba === 'objetivo' ? (
          <Objetivo sessao={sessao} />
        ) : aba === 'relatorios' ? (
          <Relatorios sessao={sessao} />
        ) : (
          <Suspense fallback={<div className="grid h-full place-items-center text-pergaminho-escuro">Abrindo o mapa…</div>}>
            <Mapa sessao={sessao} />
          </Suspense>
        )}
      </main>

      {temporada !== null && <NavegacaoInferior aba={aba} onMudar={irPara} naoLidos={naoLidos} />}
    </div>
  );
}
