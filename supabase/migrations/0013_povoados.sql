-- Povoados: vilas e cidades livres, um por território no máximo, criados com o mapa (`temporada:nova`).
-- O dono é o dono do território. A vila neutra tem um estoque que o saque leva e que volta a encher a
-- partir de `saqueada_em`; a vila de um jogador tem níveis (população a mais) e volta ao 0 se for saqueada.
-- A cidade livre dá ouro por hora e, na primeira conquista, entrega uma milícia. Tomados de outro jogador,
-- só dão bônus a partir de `leal_desde`. Tudo é gravado pelas Edge Functions; o cliente só lê.

create table public.povoados (
  id                uuid primary key default gen_random_uuid(),
  temporada_id      uuid not null references public.temporadas (id) on delete cascade,
  territorio_id     uuid not null unique references public.territorios (id) on delete cascade,
  tipo              text not null check (tipo in ('vila', 'cidade_livre')),
  nivel             int not null default 0 check (nivel >= 0),
  saqueada_em       timestamptz,
  -- Desde quando o dono atual do território tem o povoado (relógio do monopólio comercial).
  posse_desde       timestamptz,
  leal_desde        timestamptz,
  milicia_entregue  boolean not null default false
);

create index povoados_temporada on public.povoados (temporada_id);

-- Povoados se veem de longe: qualquer jogador logado enxerga todos no mapa.
alter table public.povoados enable row level security;
create policy "povoados visiveis para logados"
  on public.povoados for select to authenticated
  using (true);

revoke all on public.povoados from anon, authenticated;
grant select on public.povoados to authenticated;
