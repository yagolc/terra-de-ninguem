-- Épico 1: jogadores e convites. Entrada no jogo só por convite.

-- ---------------------------------------------------------------------------
-- jogadores: perfil público do jogador. Única entidade que atravessa temporadas.
-- ---------------------------------------------------------------------------
create table public.jogadores (
  id         uuid primary key references auth.users (id) on delete cascade,
  nome       text not null check (char_length(nome) between 1 and 24),
  cor        text check (cor ~ '^#[0-9a-f]{6}$'),
  criado_em  timestamptz not null default now()
);

alter table public.jogadores enable row level security;

-- Todos os jogadores logados veem nome e cor dos outros (necessário para o mapa).
-- Não há política de escrita: o perfil é criado pelo gatilho abaixo e alterado só pelo servidor.
create policy "jogadores visiveis para logados"
  on public.jogadores for select
  to authenticated
  using (true);

-- Cria o perfil quando o Supabase Auth cria o usuário (via convite).
-- O nome vem de user_metadata.nome, enviado pela Edge Function resgatar-convite.
create function public.criar_jogador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.jogadores (id, nome)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)), 24)
  );
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_jogador();

-- ---------------------------------------------------------------------------
-- convites: códigos de uso único. Invisível para o cliente (RLS sem políticas);
-- só a service role, usada pelas Edge Functions, lê e escreve.
-- ---------------------------------------------------------------------------
create table public.convites (
  codigo     text primary key check (codigo ~ '^[A-Z0-9-]{4,32}$'),
  email      text,  -- se preenchido, só esse e-mail pode usar o convite
  criado_em  timestamptz not null default now(),
  usado_em   timestamptz,
  usado_por  uuid references auth.users (id) on delete set null
);

alter table public.convites enable row level security;

-- Reserva o convite de forma atômica: um único UPDATE impede que dois pedidos
-- simultâneos usem o mesmo código. Devolve true se reservou.
create function public.reservar_convite(p_codigo text, p_email text)
returns boolean
language sql
security definer
set search_path = ''
as $$
  with reservado as (
    update public.convites
       set usado_em = now()
     where codigo = upper(trim(p_codigo))
       and usado_em is null
       and (email is null or lower(email) = lower(trim(p_email)))
    returning 1
  )
  select exists (select 1 from reservado);
$$;

-- Desfaz a reserva quando o envio do convite falha depois de reservar.
create function public.liberar_convite(p_codigo text)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.convites
     set usado_em = null
   where codigo = upper(trim(p_codigo))
     and usado_por is null;
$$;

-- Gera um código no formato PALAVRA-NNNN. Uso pelo organizador, no SQL Editor:
--   select public.gerar_convite('amigo@email.com');  -- preso a um e-mail
--   select public.gerar_convite();                   -- qualquer e-mail
create function public.gerar_convite(p_email text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  palavras text[] := array['LOBO', 'CORVO', 'URSO', 'FALCAO', 'JAVALI', 'LEAO', 'RAPOSA', 'DRAGAO', 'TOURO', 'GRIFO'];
  novo     text;
begin
  loop
    novo := palavras[1 + floor(random() * array_length(palavras, 1))::int]
            || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
    begin
      insert into public.convites (codigo, email) values (novo, lower(trim(p_email)));
      return novo;
    exception when unique_violation then
      -- código repetido: tenta outro
    end;
  end loop;
end;
$$;

-- As funções de convite não podem ser chamadas pelo cliente (anon/authenticated).
revoke execute on function public.reservar_convite(text, text) from public, anon, authenticated;
revoke execute on function public.liberar_convite(text)        from public, anon, authenticated;
revoke execute on function public.gerar_convite(text)          from public, anon, authenticated;
revoke execute on function public.criar_jogador()              from public, anon, authenticated;
grant  execute on function public.reservar_convite(text, text) to service_role;
grant  execute on function public.liberar_convite(text)        to service_role;
grant  execute on function public.gerar_convite(text)          to service_role;
