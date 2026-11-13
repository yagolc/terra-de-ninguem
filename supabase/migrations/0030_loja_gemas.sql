-- Loja de gemas. Gema só se ganha comprando, por Pix manual: o jogador escolhe um pacote (vira um pedido com um
-- código), paga o Pix copia e cola com o código como identificador e o organizador confirma o pedido depois de ver
-- o Pix cair. Com gemas, o jogador termina na hora a obra que está sendo feita (até o nível 7, nunca a Muralha);
-- o preço dobra a cada uso na temporada.
--
-- Saldo e pedidos pertencem ao jogador e atravessam temporadas, como `jogadores`. Os usos são da temporada: o
-- preço volta ao início na temporada nova e o placar mostra quantas vezes cada um usou. Só o servidor grava.

create table public.gemas (
  jogador_id    uuid primary key references public.jogadores (id) on delete cascade,
  saldo         integer not null default 0 check (saldo >= 0),
  atualizado_em timestamptz not null default now()
);

alter table public.gemas enable row level security;
create policy "jogador le as proprias gemas"
  on public.gemas for select to authenticated
  using (jogador_id = (select auth.uid()));
revoke all on public.gemas from anon, authenticated;
grant select on public.gemas to authenticated;

create table public.pedidos_gemas (
  id             uuid primary key default gen_random_uuid(),
  -- Vai no identificador do Pix (aparece no extrato de quem recebe) para achar o pedido.
  codigo         text not null unique default ('GEMA' || upper(substr(md5(gen_random_uuid()::text), 1, 6))),
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  gemas          integer not null check (gemas > 0),
  valor_centavos integer not null check (valor_centavos > 0),
  status         text not null default 'pendente' check (status in ('pendente', 'pago', 'cancelado')),
  criado_em      timestamptz not null default now(),
  pago_em        timestamptz,
  -- Avisos no celular: pedido novo para os organizadores e gemas creditadas para quem comprou.
  avisado         boolean not null default false,
  credito_avisado boolean not null default false
);

create index pedidos_gemas_jogador on public.pedidos_gemas (jogador_id, criado_em desc);

alter table public.pedidos_gemas enable row level security;
create policy "jogador le os proprios pedidos de gemas"
  on public.pedidos_gemas for select to authenticated
  using (jogador_id = (select auth.uid()));
revoke all on public.pedidos_gemas from anon, authenticated;
grant select on public.pedidos_gemas to authenticated;

create table public.usos_gemas (
  id           uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas (id) on delete cascade,
  jogador_id   uuid not null references public.jogadores (id) on delete cascade,
  tipo         text not null check (tipo in ('terminar_obra')),
  predio       text not null,
  nivel        integer not null,
  gemas        integer not null check (gemas > 0),
  criado_em    timestamptz not null default now()
);

create index usos_gemas_temporada_jogador on public.usos_gemas (temporada_id, jogador_id);

alter table public.usos_gemas enable row level security;
create policy "jogador le os proprios usos de gemas"
  on public.usos_gemas for select to authenticated
  using (jogador_id = (select auth.uid()));
revoke all on public.usos_gemas from anon, authenticated;
grant select on public.usos_gemas to authenticated;

-- Quantas vezes cada jogador usou gemas na temporada (público, para o placar). Não diz em quê.
create function public.usos_de_gemas_na_temporada(p_temporada uuid)
returns table (
  jogador_id uuid,
  usos       integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.jogador_id, count(*)::int from public.usos_gemas u where u.temporada_id = p_temporada group by u.jogador_id;
$$;

revoke all on function public.usos_de_gemas_na_temporada(uuid) from public, anon;
grant execute on function public.usos_de_gemas_na_temporada(uuid) to authenticated;

-- Quem recebe o aviso no celular de cada pedido novo (quem confere o Pix). Ninguém lê pelo site; entra pelo SQL:
--   insert into public.organizadores select id from auth.users where email = 'organizador@email.com';
create table public.organizadores (
  jogador_id uuid primary key references public.jogadores (id) on delete cascade
);
alter table public.organizadores enable row level security;
revoke all on public.organizadores from anon, authenticated;

-- Comandos do organizador (pelo SQL, nunca pelo cliente):
--   select * from public.pedidos_gemas_pendentes();          -- quem pediu, quanto e o código do Pix
--   select public.confirmar_pedido_gemas('GEMA1A2B3C');        -- o Pix caiu: credita as gemas
--   select public.cancelar_pedido_gemas('GEMA1A2B3C');         -- desistiu ou não pagou
--   select public.creditar_gemas('amigo@email.com', 4);        -- ajuste manual (negativo tira)
create function public.pedidos_gemas_pendentes()
returns table (codigo text, jogador text, email text, gemas integer, valor_reais numeric, criado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.codigo, j.nome, u.email::text, p.gemas, p.valor_centavos / 100.0, p.criado_em
    from public.pedidos_gemas p
    join public.jogadores j on j.id = p.jogador_id
    left join auth.users u on u.id = p.jogador_id
   where p.status = 'pendente'
   order by p.criado_em;
$$;

create function public.confirmar_pedido_gemas(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pedido public.pedidos_gemas;
  novo   integer;
begin
  select * into pedido from public.pedidos_gemas where codigo = upper(trim(p_codigo)) for update;
  if not found then raise exception 'Pedido % não existe.', p_codigo; end if;
  if pedido.status <> 'pendente' then raise exception 'Pedido % já está %.', pedido.codigo, pedido.status; end if;

  update public.pedidos_gemas set status = 'pago', pago_em = now() where id = pedido.id;
  insert into public.gemas (jogador_id, saldo) values (pedido.jogador_id, pedido.gemas)
    on conflict (jogador_id) do update set saldo = public.gemas.saldo + excluded.saldo, atualizado_em = now()
    returning saldo into novo;
  return format('%s gemas creditadas. Saldo agora: %s.', pedido.gemas, novo);
end;
$$;

create function public.cancelar_pedido_gemas(p_codigo text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.pedidos_gemas set status = 'cancelado' where codigo = upper(trim(p_codigo)) and status = 'pendente';
  if not found then raise exception 'Pedido % não existe ou não está pendente.', p_codigo; end if;
  return 'Pedido cancelado.';
end;
$$;

create function public.creditar_gemas(p_email text, p_gemas integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  jogador uuid;
  novo    integer;
begin
  select u.id into jogador from auth.users u where lower(u.email) = lower(trim(p_email));
  if jogador is null then raise exception 'Nenhum jogador com o e-mail %.', p_email; end if;
  insert into public.gemas (jogador_id, saldo) values (jogador, greatest(p_gemas, 0))
    on conflict (jogador_id) do update set saldo = public.gemas.saldo + p_gemas, atualizado_em = now()
    returning saldo into novo;
  return format('Saldo agora: %s gemas.', novo);
end;
$$;

revoke execute on function public.pedidos_gemas_pendentes()           from public, anon, authenticated;
revoke execute on function public.confirmar_pedido_gemas(text)        from public, anon, authenticated;
revoke execute on function public.cancelar_pedido_gemas(text)         from public, anon, authenticated;
revoke execute on function public.creditar_gemas(text, integer)       from public, anon, authenticated;
grant  execute on function public.pedidos_gemas_pendentes()           to service_role;
grant  execute on function public.confirmar_pedido_gemas(text)        to service_role;
grant  execute on function public.cancelar_pedido_gemas(text)         to service_role;
grant  execute on function public.creditar_gemas(text, integer)       to service_role;
