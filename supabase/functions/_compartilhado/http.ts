// Utilidades HTTP comuns às Edge Functions. Pastas que começam com "_" não viram funções.

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function resposta(status: number, corpo: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

/** Erro com mensagem para o jogador; vira uma resposta com o status indicado. */
export class ErroDoJogo extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.status = status;
  }
}
