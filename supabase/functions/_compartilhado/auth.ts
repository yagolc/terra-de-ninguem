import { createClient } from 'jsr:@supabase/supabase-js@2';
import { ErroDoJogo } from './http.ts';

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Valida o token do jogador (cabeçalho Authorization) no Supabase Auth e devolve o id dele. */
export async function jogadorDaRequisicao(req: Request): Promise<string> {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new ErroDoJogo('Entre no jogo de novo.', 401);

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new ErroDoJogo('Sua sessão expirou. Entre no jogo de novo.', 401);
  return data.user.id;
}
