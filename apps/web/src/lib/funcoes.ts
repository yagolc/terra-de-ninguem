import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Chama uma Edge Function e devolve o corpo da resposta.
 * Em caso de recusa, lança um Error com a mensagem em português vinda do servidor.
 */
export async function chamarFuncao<T = Record<string, unknown>>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('O Supabase não está configurado.');

  const { data, error } = await supabase.functions.invoke<T>(nome, { body: corpo });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const resposta = (await error.context.json().catch(() => null)) as { erro?: string } | null;
      if (resposta?.erro) throw new Error(resposta.erro);
    }
    throw new Error('Não foi possível falar com o servidor. Tente de novo em instantes.');
  }
  return data as T;
}
