-- Épico 7: objetivos secretos, placar da temporada e encerramento.

alter table public.temporadas
  add column encerrada_em timestamptz,
  add column motivo_fim text check (motivo_fim in ('objetivo', 'prazo'));

-- Temporada atual: prazo de 3 semanas a partir do início (as novas já nascem assim no script).
update public.temporadas set fim_previsto = inicio + interval '21 days' where status = 'ativa';

-- ---------------------------------------------------------------------------
-- objetivos: secreto até o fim da temporada; depois todos são revelados.
-- ---------------------------------------------------------------------------
create table public.objetivos (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references public.temporadas (id) on delete cascade,
  jogador_id    uuid not null references public.jogadores (id) on delete cascade,
  -- Formato do tipo Objetivo de packages/regras/src/objetivos.ts.
  objetivo      jsonb not null,
  sorteado_em   timestamptz not null default now(),
  cumprido_em   timestamptz,
  unique (temporada_id, jogador_id)
);

alter table public.objetivos enable row level security;
create policy "objetivo e do dono ate a temporada acabar"
  on public.objetivos for select to authenticated
  using (
    jogador_id = (select auth.uid())
    or exists (select 1 from public.temporadas t where t.id = objetivos.temporada_id and t.status = 'encerrada')
  );

-- ---------------------------------------------------------------------------
-- placar: recalculado a cada minuto pelo resolver-marchas. Público (é o ranking).
-- ---------------------------------------------------------------------------
create table public.placar (
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  territorios    int not null default 0,
  populacao      int not null default 0,
  vitorias       int not null default 0,
  pontos         int not null default 0,
  atualizado_em  timestamptz not null default now(),
  primary key (temporada_id, jogador_id)
);

alter table public.placar enable row level security;
create policy "placar visivel para logados" on public.placar for select to authenticated using (true);

revoke all on public.objetivos, public.placar from anon, authenticated;
grant select on public.objetivos, public.placar to authenticated;
