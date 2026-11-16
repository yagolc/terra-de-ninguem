-- Jogador ausente (regras: packages/regras/src/ausencia.ts, números em BALANCEAMENTO.ausencia).
-- `visto_em`: última vez que o jogador abriu o jogo ou mandou um comando nesta temporada (por cidade, porque cada
-- sala é uma partida). O agendador marca `ausente_desde` depois de alguns dias sem ele e, a cada intervalo, um
-- território dele se rebela (`ultima_rebeliao`). Quem volta tem `ausente_desde` apagado e ganha um escudo.
-- As cidades que já existem começam a contar agora: ninguém fica ausente na hora em que a regra entra.

alter table public.cidades
  add column visto_em        timestamptz not null default now(),
  add column ausente_desde   timestamptz,
  add column ultima_rebeliao timestamptz,
  -- Aviso no celular de que as terras vão se rebelar: gravado quando sai, para sair uma vez por ausência.
  add column ausencia_avisada_em timestamptz;

create index cidades_ausentes on public.cidades (temporada_id) where ausente_desde is not null;

-- Territórios que se rebelaram: o dono antigo vê em Relatórios e recebe o aviso no celular. Só ele lê.
create table public.rebelioes (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references public.temporadas (id) on delete cascade,
  jogador_id    uuid not null references public.jogadores (id) on delete cascade,
  territorio_id uuid not null references public.territorios (id) on delete cascade,
  criado_em     timestamptz not null default now(),
  lido          boolean not null default false,
  avisado       boolean not null default false
);

create index rebelioes_jogador on public.rebelioes (jogador_id, criado_em desc);
create index rebelioes_nao_avisadas on public.rebelioes (criado_em) where not avisado;

alter table public.rebelioes enable row level security;
create policy "jogador le as proprias rebelioes"
  on public.rebelioes for select to authenticated
  using (jogador_id = (select auth.uid()));
revoke all on public.rebelioes from anon, authenticated;
grant select on public.rebelioes to authenticated;

-- Quem está 💤 Ausente na temporada (público, para o mapa e o placar). Não diz quando cada um foi visto.
create function public.ausentes_na_temporada(p_temporada uuid)
returns table (jogador_id uuid, ausente_desde timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select c.jogador_id, c.ausente_desde from public.cidades c
   where c.temporada_id = p_temporada and c.ausente_desde is not null;
$$;

revoke all on function public.ausentes_na_temporada(uuid) from public, anon;
grant execute on function public.ausentes_na_temporada(uuid) to authenticated;
