import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * As leituras do banco (PostgREST) levam `x-terra-salas: 1`: com ele, o RLS de `temporadas` mostra todas as salas.
 * O site antigo (guardado no celular) não manda e continua vendo só a Sala principal (migration 0037).
 */
const buscarComSalas: typeof fetch = (entrada, init) => {
  const endereco = typeof entrada === 'string' ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  if (!endereco.includes('/rest/v1/')) return fetch(entrada, init);
  const cabecalhos = new Headers(init?.headers ?? (entrada instanceof Request ? entrada.headers : undefined));
  cabecalhos.set('x-terra-salas', '1');
  return fetch(entrada, { ...init, headers: cabecalhos });
};

/** null enquanto apps/web/.env.local não estiver preenchido. */
export const supabase: SupabaseClient | null = url && chaveAnon ? createClient(url, chaveAnon, { global: { fetch: buscarComSalas } }) : null;
