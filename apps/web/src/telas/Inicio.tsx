import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Botao from '../componentes/Botao';
import Moldura from '../componentes/Moldura';
import { supabase } from '../lib/supabase';

type Jogador = { nome: string; cor: string | null };

/** Tela provisória do Épico 1: confirma que o jogador entrou. Vira a tela Cidade no Épico 3. */
export default function Inicio({ sessao }: { sessao: Session }) {
  const [jogador, setJogador] = useState<Jogador | null>(null);

  useEffect(() => {
    supabase
      ?.from('jogadores')
      .select('nome, cor')
      .eq('id', sessao.user.id)
      .maybeSingle<Jogador>()
      .then(({ data }) => setJogador(data));
  }, [sessao.user.id]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Moldura>
        <div className="space-y-5 text-center">
          <img src="/escudo.svg" alt="" className="mx-auto size-14" />
          <h1 className="font-titulo text-2xl text-ouro">Bem-vindo, {jogador?.nome ?? sessao.user.email}</h1>
          <p className="text-pergaminho-escuro">
            Você está dentro. Sua cidade será erguida quando a primeira temporada começar.
          </p>
          <Botao variante="discreto" onClick={() => supabase?.auth.signOut()}>
            Sair
          </Botao>
        </div>
      </Moldura>
    </main>
  );
}
