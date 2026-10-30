-- Épico 6: marchas, relatórios de batalha, escudos e o job que resolve as marchas que chegaram.

-- ---------------------------------------------------------------------------
-- marchas: ataques a caminho e tropas voltando para casa. Só o dono vê as próprias
-- (sem torre de vigia, o defensor só descobre o ataque pelo relatório).
-- ---------------------------------------------------------------------------
create table public.marchas (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  origem_id      uuid not null references public.territorios (id) on delete cascade,
  destino_id     uuid not null references public.territorios (id) on delete cascade,
  tipo           text not null check (tipo in ('saque', 'conquista', 'retorno')),
  lanceiro       int not null default 0 check (lanceiro >= 0),
  arqueiro       int not null default 0 check (arqueiro >= 0),
  cavalaria      int not null default 0 check (cavalaria >= 0),
  -- Saque carregado (só em marchas de retorno).
  saque_comida   double precision not null default 0 check (saque_comida >= 0),
  saque_madeira  double precision not null default 0 check (saque_madeira >= 0),
  saque_ouro     double precision not null default 0 check (saque_ouro >= 0),
  partida_em     timestamptz not null,
  chegada_em     timestamptz not null,
  status         text not null default 'a_caminho' check (status in ('a_caminho', 'concluida'))
);

create index marchas_a_resolver on public.marchas (chegada_em) where status = 'a_caminho';
create index marchas_jogador on public.marchas (jogador_id, temporada_id);

alter table public.marchas enable row level security;
create policy "jogador ve as proprias marchas"
  on public.marchas for select to authenticated
  using (jogador_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- relatorios: resultado de cada batalha, visível só para os dois lados.
-- ---------------------------------------------------------------------------
create table public.relatorios (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  marcha_id      uuid references public.marchas (id) on delete set null,
  tipo           text not null check (tipo in ('saque', 'conquista')),
  atacante_id    uuid not null references public.jogadores (id) on delete cascade,
  -- Nulo quando o defensor eram bárbaros.
  defensor_id    uuid references public.jogadores (id) on delete cascade,
  origem_id      uuid not null references public.territorios (id) on delete cascade,
  territorio_id  uuid not null references public.territorios (id) on delete cascade,
  vencedor       text not null check (vencedor in ('atacante', 'defensor')),
  conquistou     boolean not null default false,
  -- Forças, sorte, exércitos, perdas e saque (formato em supabase/functions/resolver-marchas).
  dados          jsonb not null,
  criado_em      timestamptz not null default now(),
  lido_atacante  boolean not null default false,
  lido_defensor  boolean not null default false
);

create index relatorios_atacante on public.relatorios (atacante_id, criado_em desc);
create index relatorios_defensor on public.relatorios (defensor_id, criado_em desc);

alter table public.relatorios enable row level security;
create policy "lados da batalha veem o relatorio"
  on public.relatorios for select to authenticated
  using (atacante_id = (select auth.uid()) or defensor_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- protecoes: escudo de quem perdeu uma defesa. Público: o atacante precisa saber.
-- A proteção de iniciante vem do início da temporada e não precisa de linha.
-- ---------------------------------------------------------------------------
create table public.protecoes (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references public.temporadas (id) on delete cascade,
  jogador_id    uuid not null references public.jogadores (id) on delete cascade,
  tipo          text not null default 'escudo' check (tipo in ('escudo')),
  ate           timestamptz not null,
  unique (temporada_id, jogador_id, tipo)
);

alter table public.protecoes enable row level security;
create policy "protecoes visiveis para logados"
  on public.protecoes for select to authenticated using (true);

revoke all on public.marchas, public.relatorios, public.protecoes from anon, authenticated;
grant select on public.marchas, public.relatorios, public.protecoes to authenticated;

-- ---------------------------------------------------------------------------
-- Job de 1 em 1 minuto: chama a Edge Function resolver-marchas. A senha fica no Vault
-- (segredo "segredo_cron", criado fora do git) e na variável SEGREDO_CRON da função.
-- Também mantém o projeto ativo (o plano gratuito pausa após 7 dias sem uso).
-- ---------------------------------------------------------------------------
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'resolver-marchas',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://wbhcmkortcklhcojphlx.supabase.co/functions/v1/resolver-marchas',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-segredo-cron', (select decrypted_secret from vault.decrypted_secrets where name = 'segredo_cron')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
