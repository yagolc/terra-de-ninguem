// Conexão direta ao Postgres: o cliente supabase-js não abre transações, e os comandos do jogo
// precisam de transação com trava na linha da cidade (select ... for update).
import postgres from 'npm:postgres@3.4.5';

export const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { prepare: false, max: 3 });

export type Transacao = postgres.TransactionSql;
