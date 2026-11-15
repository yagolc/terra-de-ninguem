import { FunctionsHttpError } from '@supabase/supabase-js';
import { temporadaEmAndamento } from './salas';
import { supabase } from './supabase';

/**
 * Chama uma Edge Function e devolve o corpo da resposta. Os comandos da função `cidade` levam a temporada da sala
 * aberta (`temporada_id`), a não ser que já venha no corpo.
 * Em caso de recusa, lança um Error com a mensagem em português vinda do servidor.
 */
export async function chamarFuncao<T = Record<string, unknown>>(nome: string, corpo: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error('O Supabase não está configurado.');

  const temporada = temporadaEmAndamento();
  const corpoFinal = nome === 'cidade' && temporada && !('temporada_id' in corpo) ? { ...corpo, temporada_id: temporada.id } : corpo;
  const { data, error } = await supabase.functions.invoke<T>(nome, { body: corpoFinal });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const resposta = (await error.context.json().catch(() => null)) as { erro?: string } | null;
      if (resposta?.erro) throw new Error(resposta.erro);
    }
    throw new Error('Não foi possível falar com o servidor. Tente de novo em instantes.');
  }
  return data as T;
}
