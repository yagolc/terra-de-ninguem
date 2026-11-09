-- Estradas: à parte da estrutura do território (um território pode ter uma estrada e uma estrutura).
-- Marcha de movimento entre dois territórios próprios com estrada pronta anda mais rápido (regras: `multiplicadorEstrada`).
-- Feitas pela função `cidade` (construir_estrada) e apagadas pelo resolver-marchas quando o território é conquistado.
-- Estrada não dá para esconder: todos os jogadores logados veem todas no mapa. Ninguém grava direto.

create table public.estradas (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  territorio_id  uuid not null unique references public.territorios (id) on delete cascade,
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  -- Antes disso a estrada está em obra e não acelera nada.
  pronto_em      timestamptz not null,
  criado_em      timestamptz not null default now()
);

create index estradas_temporada on public.estradas (temporada_id);
create index estradas_jogador on public.estradas (jogador_id);

alter table public.estradas enable row level security;
create policy "estradas visiveis para logados"
  on public.estradas for select to authenticated
  using (true);

revoke all on public.estradas from anon, authenticated;
grant select on public.estradas to authenticated;
