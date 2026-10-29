import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** Sessão atual do Supabase Auth. `undefined` enquanto carrega, `null` se deslogado. */
export function useSessao(): Session | null | undefined {
  const [sessao, setSessao] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSessao(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => setSessao(novaSessao));
    return () => data.subscription.unsubscribe();
  }, []);

  return sessao;
}
