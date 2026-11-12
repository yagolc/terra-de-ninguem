-- Pombos-correio: o prédio Pombal, as cartas entre jogadores e os pactos de não agressão.
-- A carta voa da cidade de quem manda até a de quem recebe (`chega_em`, regras: `duracaoVooMs`). Pode levar
-- uma proposta de pacto de 1 a 12 horas; aceita, `pacto_ate` marca até quando os dois não podem se atacar
-- (o envio de ataques recusa e a marcha que chega durante o pacto volta sem lutar).
-- Tudo é feito pela função `cidade` (enviar_carta, responder_pacto, marcar_cartas_lidas). Ninguém grava direto.
-- Cartas e pactos são secretos: só quem mandou e quem recebeu (depois de chegar) leem.

-- Pombal: mais um prédio. As cidades que já existem ganham a linha no nível 0.
alter table public.predios drop constraint predios_tipo_check;
alter table public.predios add constraint predios_tipo_check
  check (tipo in ('centro', 'casa', 'fazenda', 'serraria', 'mercado', 'armazem', 'quartel', 'muralha', 'pombal'));
alter table public.obras drop constraint obras_tipo_check;
alter table public.obras add constraint obras_tipo_check
  check (tipo in ('centro', 'casa', 'fazenda', 'serraria', 'mercado', 'armazem', 'quartel', 'muralha', 'pombal'));
insert into public.predios (cidade_id, tipo, nivel)
  select id, 'pombal', 0 from public.cidades
  on conflict (cidade_id, tipo) do nothing;

create table public.cartas (
  id               uuid primary key default gen_random_uuid(),
  temporada_id     uuid not null references public.temporadas (id) on delete cascade,
  remetente_id     uuid not null references public.jogadores (id) on delete cascade,
  destinatario_id  uuid not null references public.jogadores (id) on delete cascade,
  texto            text not null default '' check (char_length(texto) <= 500),
  -- Proposta de pacto (só não agressão por enquanto) e quantas horas ele dura depois do aceite.
  proposta         text check (proposta in ('nao_agressao')),
  horas_pacto      int check (horas_pacto between 1 and 12),
  enviada_em       timestamptz not null default now(),
  chega_em         timestamptz not null,
  lida             boolean not null default false,
  resposta         text check (resposta in ('aceita', 'recusada')),
  respondida_em    timestamptz,
  -- Quem mandou já viu a resposta (aviso de não lidas).
  resposta_vista   boolean not null default false,
  pacto_ate        timestamptz,
  check (remetente_id <> destinatario_id),
  check ((proposta is null) = (horas_pacto is null)),
  check (resposta is null or proposta is not null),
  check ((resposta = 'aceita') = (pacto_ate is not null))
);

create index cartas_destinatario on public.cartas (destinatario_id, chega_em);
create index cartas_remetente on public.cartas (remetente_id, chega_em);
create index cartas_pactos on public.cartas (temporada_id, pacto_ate) where pacto_ate is not null;

alter table public.cartas enable row level security;
create policy "remetente e destinatario leem a carta"
  on public.cartas for select to authenticated
  using (
    remetente_id = (select auth.uid())
    or (destinatario_id = (select auth.uid()) and chega_em <= now())
  );

revoke all on public.cartas from anon, authenticated;
grant select on public.cartas to authenticated;
