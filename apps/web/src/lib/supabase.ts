import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null enquanto apps/web/.env.local não estiver preenchido. */
export const supabase: SupabaseClient | null = url && chaveAnon ? createClient(url, chaveAnon) : null;
