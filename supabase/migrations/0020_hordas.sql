-- Hordas bárbaras (regras: `hordas.ts`). O resolver-marchas cria uma por dia depois da proteção de iniciante e a
-- resolve quando chega. Tudo aqui é público: todos veem a horda vindo e como terminou (sem o exército do
-- defensor, que continua secreto). Ninguém grava direto.

create table public.hordas (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  -- 1 = a primeira da temporada; define o tamanho e a recompensa.
  numero         int not null,
  territorio_id  uuid not null references public.territorios (id) on delete cascade,
  -- Dono do alvo quando a horda saiu (pode mudar até ela chegar; ela ataca quem estiver lá).
  alvo_id        uuid references public.jogadores (id) on delete set null,
  lanceiro       int not null,
  arqueiro       int not null,
  cavalaria      int not null,
  -- Ponto da borda do mapa de onde ela vem (só para desenhar).
  origem_x       real not null,
  origem_y       real not null,
  partida_em     timestamptz not null,
  chegada_em     timestamptz not null,
  status         text not null default 'a_caminho' check (status in ('a_caminho', 'resolvida')),
  -- Preenchidos na chegada. vencedor nulo = a horda se dispersou (o alvo virou neutro antes).
  defensor_id    uuid references public.jogadores (id) on delete set null,
  vencedor       text check (vencedor in ('horda', 'defensor')),
  conquistou     boolean not null default false,
  -- Ouro do defensor que venceu, saque da cidade, sobreviventes e perdas da horda.
  resultado      jsonb,
  unique (temporada_id, numero)
);

create index hordas_a_resolver on public.hordas (chegada_em) where status = 'a_caminho';

alter table public.hordas enable row level security;
create policy "hordas visiveis para logados"
  on public.hordas for select to authenticated
  using (true);

revoke all on public.hordas from anon, authenticated;
grant select on public.hordas to authenticated;
