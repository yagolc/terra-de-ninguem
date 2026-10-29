import type { Session } from '@supabase/supabase-js';
import { Suspense, lazy, useEffect, useState } from 'react';
import NavegacaoInferior, { ABAS, type Aba } from '../componentes/NavegacaoInferior';
import { supabase } from '../lib/supabase';
import Cidade from './Cidade';

// O Phaser (cerca de 1 MB) só é baixado quando o jogador abre o mapa.
const Mapa = lazy(() => import('./Mapa'));

function abaDoEndereco(): Aba {
  return location.hash === '#mapa' ? 'mapa' : 'cidade';
}

/** Moldura do jogo logado: cabeçalho, abas (topo no desktop, barra inferior no celular) e a tela ativa. */
export default function Jogo({ sessao }: { sessao: Session }) {
  const [aba, setAba] = useState<Aba>(abaDoEndereco);
  const [nome, setNome] = useState<string | null>(null);
  const [temporada, setTemporada] = useState<number | null>(null);

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
          <nav className="hidden gap-1 md:flex">
            {ABAS.map((item) => {
              const pronta = item.id !== 'relatorios';
              return (
                <button
                  key={item.id}
                  disabled={!pronta}
                  onClick={() => pronta && irPara(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm ${
                    item.id === aba
                      ? 'bg-couro text-ouro'
                      : pronta
                        ? 'text-pergaminho-escuro hover:text-pergaminho'
                        : 'text-pergaminho-escuro/40'
                  }`}
                >
                  {item.icone} {item.rotulo}
                  {!pronta && ' (em breve)'}
                </button>
              );
            })}
          </nav>
          <button
            onClick={() => supabase?.auth.signOut()}
            className="rounded-lg border border-couro px-3 py-1.5 text-sm text-pergaminho-escuro hover:text-pergaminho"
          >
            Sair
          </button>
        </div>
      </header>

      <main className={`min-h-0 flex-1 ${aba === 'mapa' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {aba === 'cidade' ? (
          <Cidade sessao={sessao} />
        ) : (
          <Suspense fallback={<div className="grid h-full place-items-center text-pergaminho-escuro">Abrindo o mapa…</div>}>
            <Mapa sessao={sessao} />
          </Suspense>
        )}
      </main>

      <NavegacaoInferior aba={aba} onMudar={irPara} />
    </div>
  );
}
