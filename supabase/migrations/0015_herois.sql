-- Heróis: um por jogador na temporada, com nome e especialidade. Fica num território (territorio_id) ou
-- numa marcha (marcha_id), nunca nos dois. O treino sobe o nível ao começar e o deixa ocupado até
-- treino_pronto_em; perder uma batalha o deixa ferido até ferido_ate (ele nunca morre).
-- Secreto: só o dono lê. Os outros veem o herói só em relatórios de batalha e de batedor.

create table public.herois (
  id                uuid primary key default gen_random_uuid(),
  temporada_id      uuid not null references public.temporadas (id) on delete cascade,
  jogador_id        uuid not null references public.jogadores (id) on delete cascade,
  nome              text not null check (char_length(nome) between 2 and 20),
  especialidade     text not null check (especialidade in ('comandante', 'castelao', 'desbravador', 'saqueador', 'intendente')),
  nivel             int not null default 1 check (nivel between 1 and 10),
  territorio_id     uuid references public.territorios (id) on delete set null,
  marcha_id         uuid references public.marchas (id) on delete set null,
  treino_pronto_em  timestamptz,
  ferido_ate        timestamptz,
  criado_em         timestamptz not null default now(),
  unique (temporada_id, jogador_id)
);

create index herois_territorio on public.herois (territorio_id);

alter table public.herois enable row level security;
create policy "jogador ve o proprio heroi"
  on public.herois for select to authenticated
  using (jogador_id = (select auth.uid()));

revoke all on public.herois from anon, authenticated;
grant select on public.herois to authenticated;

-- A marcha leva o herói (as marchas já são secretas para os outros).
alter table public.marchas add column heroi_id uuid references public.herois (id) on delete set null;

-- O batedor anota o herói que viu no território: { nome, especialidade, nivel }.
alter table public.reconhecimentos add column heroi jsonb;
