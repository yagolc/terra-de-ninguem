-- Itens da loja de gemas: bandeiras exclusivas, títulos, cores ouro e prata (permanentes, atravessam temporadas) e
-- o destaque da cidade no mapa (vale para uma temporada). Só a função `cidade` grava (ação `comprar_item`).

create table public.itens_comprados (
  id           uuid primary key default gen_random_uuid(),
  jogador_id   uuid not null references public.jogadores (id) on delete cascade,
  item         text not null check (item ~ '^[a-z_]{1,40}$'),
  -- O título comprado (item `titulo`); nulo nos outros.
  variante     text check (variante ~ '^[a-z_]{1,40}$'),
  -- Itens de temporada; nulo nos permanentes.
  temporada_id uuid references public.temporadas (id) on delete cascade,
  gemas        integer not null check (gemas >= 0),
  criado_em    timestamptz not null default now()
);

-- Cada item (com a variante) uma vez só: permanente uma vez na vida, de temporada uma vez por temporada.
create unique index itens_comprados_unicos
  on public.itens_comprados (jogador_id, item, coalesce(variante, ''), coalesce(temporada_id, '00000000-0000-0000-0000-000000000000'));

alter table public.itens_comprados enable row level security;
create policy "jogador le os proprios itens comprados"
  on public.itens_comprados for select to authenticated
  using (jogador_id = (select auth.uid()));
revoke all on public.itens_comprados from anon, authenticated;
grant select on public.itens_comprados to authenticated;

-- Título que o jogador mostra no placar e no perfil (público, como o resto do perfil). Só um que ele comprou.
alter table public.jogadores add column titulo text check (titulo ~ '^[a-z_]{1,40}$');

-- Quem comprou o destaque da cidade na temporada (público, para o mapa): só os jogadores, nada mais.
create function public.destaques_na_temporada(p_temporada uuid)
returns table (jogador_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct i.jogador_id from public.itens_comprados i
   where i.temporada_id = p_temporada and i.item = 'destaque_cidade';
$$;

revoke all on function public.destaques_na_temporada(uuid) from public, anon;
grant execute on function public.destaques_na_temporada(uuid) to authenticated;
