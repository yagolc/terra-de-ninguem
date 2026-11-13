-- Loja, parte 2: Arauto (mensagem pública no alto do mapa por 24 h, comprada com gemas) e presente de gemas entre
-- jogadores. Só a função `cidade` grava (ações `publicar_arauto` e `presentear_gemas`).

create table public.arautos (
  id           uuid primary key default gen_random_uuid(),
  temporada_id uuid not null references public.temporadas (id) on delete cascade,
  jogador_id   uuid not null references public.jogadores (id) on delete cascade,
  texto        text not null check (char_length(texto) between 1 and 140),
  gemas        integer not null check (gemas >= 0),
  criado_em    timestamptz not null default now(),
  ate          timestamptz not null,
  -- Aviso no celular (tipo `carta`) para os outros jogadores da temporada.
  avisado      boolean not null default false
);

create index arautos_temporada_ate on public.arautos (temporada_id, ate desc);

-- Público para quem está logado: é um anúncio para todos.
alter table public.arautos enable row level security;
create policy "arautos visiveis para logados"
  on public.arautos for select to authenticated
  using (true);
revoke all on public.arautos from anon, authenticated;
grant select on public.arautos to authenticated;

create table public.presentes_gemas (
  id              uuid primary key default gen_random_uuid(),
  remetente_id    uuid not null references public.jogadores (id) on delete cascade,
  destinatario_id uuid not null references public.jogadores (id) on delete cascade,
  gemas           integer not null check (gemas > 0),
  criado_em       timestamptz not null default now(),
  -- Aviso no celular para quem recebeu.
  avisado         boolean not null default false,
  check (remetente_id <> destinatario_id)
);

create index presentes_gemas_remetente on public.presentes_gemas (remetente_id, criado_em desc);
create index presentes_gemas_destinatario on public.presentes_gemas (destinatario_id, criado_em desc);

-- Só quem mandou e quem recebeu veem o presente.
alter table public.presentes_gemas enable row level security;
create policy "presentes de gemas de quem mandou ou recebeu"
  on public.presentes_gemas for select to authenticated
  using (remetente_id = (select auth.uid()) or destinatario_id = (select auth.uid()));
revoke all on public.presentes_gemas from anon, authenticated;
grant select on public.presentes_gemas to authenticated;
