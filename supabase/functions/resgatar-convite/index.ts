// Edge Function: resgata um código de convite e envia o link mágico de criação de conta.
// Publicar com: npx supabase functions deploy resgatar-convite --no-verify-jwt
// (quem chama ainda não tem conta, então não há JWT de usuário para verificar).
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function resposta(status: number, corpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return resposta(405, { erro: 'Método não permitido.' });

  let dados: Record<string, unknown>;
  try {
    dados = await req.json();
  } catch {
    return resposta(400, { erro: 'Pedido inválido.' });
  }

  const codigo = String(dados.codigo ?? '').trim().toUpperCase();
  const email = String(dados.email ?? '').trim().toLowerCase();
  const nome = String(dados.nome ?? '').trim();
  const redirecionarPara = typeof dados.redirecionarPara === 'string' ? dados.redirecionarPara : undefined;

  if (!codigo) return resposta(400, { erro: 'Informe o código do convite.' });
  if (!EMAIL_VALIDO.test(email)) return resposta(400, { erro: 'E-mail inválido.' });
  if (nome.length < 1 || nome.length > 24) return resposta(400, { erro: 'O nome deve ter de 1 a 24 caracteres.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: reservado, error: erroReserva } = await admin.rpc('reservar_convite', {
    p_codigo: codigo,
    p_email: email,
  });
  if (erroReserva) {
    console.error('reservar_convite', erroReserva);
    return resposta(500, { erro: 'Erro ao validar o convite. Tente de novo.' });
  }
  if (!reservado) {
    return resposta(400, { erro: 'Convite inválido, já usado ou destinado a outro e-mail.' });
  }

  // O redirectTo precisa estar na lista de URLs permitidas do Supabase Auth.
  const { data: convidado, error: erroConvite } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { nome },
    redirectTo: redirecionarPara,
  });

  if (erroConvite) {
    await admin.rpc('liberar_convite', { p_codigo: codigo });
    if (erroConvite.code === 'email_exists' || /already been registered/i.test(erroConvite.message)) {
      return resposta(409, { erro: 'Esse e-mail já tem conta. Use a aba "Entrar".' });
    }
    console.error('inviteUserByEmail', erroConvite);
    return resposta(500, { erro: 'Não foi possível enviar o e-mail de convite. Tente de novo.' });
  }

  await admin.from('convites').update({ usado_por: convidado.user.id }).eq('codigo', codigo);

  return resposta(200, { ok: true });
});
