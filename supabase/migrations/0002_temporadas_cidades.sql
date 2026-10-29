-- Épico 3: temporadas, cidades e prédios. Escrita só pela Edge Function `cidade` (service role);
-- o cliente apenas lê a própria cidade.

-- ---------------------------------------------------------------------------
-- temporadas: quase tudo pertence a uma temporada; resetar o mapa é criar outra.
-- ---------------------------------------------------------------------------
create table public.temporadas (
  id            uuid primary key default gen_random_uuid(),
  numero        int not null unique,
  inicio        timestamptz not null default now(),
  fim_previsto  timestamptz,
  status        text not null default 'preparando' check (status in ('preparando', 'ativa', 'encerrada')),
  vencedor_id   uuid references public.jogadores (id) on delete set null,
  criado_em     timestamptz not null default now()
);

-- No máximo uma temporada ativa por vez.
create unique index temporadas_uma_ativa on public.temporadas ((true)) where status = 'ativa';

alter table public.temporadas enable row level security;
create policy "temporadas visiveis para logados"
  on public.temporadas for select to authenticated using (true);

-- Temporada de testes enquanto o gerador de mapa (Épico 4) não existe.
insert into public.temporadas (numero, status, fim_previsto) values (1, 'ativa', now() + interval '28 days');

-- ---------------------------------------------------------------------------
-- cidades: estado econômico. atualizado_em é a base do cálculo por tempo decorrido.
-- Recursos e população são fracionários (produção contínua); a interface arredonda.
-- ---------------------------------------------------------------------------
create table public.cidades (
  id                     uuid primary key default gen_random_uuid(),
  temporada_id           uuid not null references public.temporadas (id) on delete cascade,
  jogador_id             uuid not null references public.jogadores (id) on delete cascade,
  territorio_id          uuid,  -- vira chave estrangeira no Épico 4 (mapa)
  comida                 double precision not null check (comida >= 0),
  madeira                double precision not null check (madeira >= 0),
  ouro                   double precision not null check (ouro >= 0),
  populacao              double precision not null check (populacao >= 0),
  trabalhadores_comida   int not null default 0 check (trabalhadores_comida >= 0),
  trabalhadores_madeira  int not null default 0 check (trabalhadores_madeira >= 0),
  trabalhadores_ouro     int not null default 0 check (trabalhadores_ouro >= 0),
  atualizado_em          timestamptz not null,
  criado_em              timestamptz not null default now(),
  unique (temporada_id, jogador_id)
);

create index cidades_jogador on public.cidades (jogador_id);

alter table public.cidades enable row level security;
create policy "jogador ve a propria cidade"
  on public.cidades for select to authenticated
  using (jogador_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- predios: uma linha por tipo. pronto_em preenchido = subindo para nivel + 1.
-- ---------------------------------------------------------------------------
create table public.predios (
  cidade_id  uuid not null references public.cidades (id) on delete cascade,
  tipo       text not null check (tipo in ('centro', 'casa', 'fazenda', 'serraria', 'mercado', 'armazem', 'quartel', 'muralha')),
  nivel      int not null default 0 check (nivel >= 0),
  pronto_em  timestamptz,
  primary key (cidade_id, tipo)
);

-- Regra do MVP garantida pelo banco: uma obra por vez em cada cidade.
create unique index predios_uma_obra_por_cidade on public.predios (cidade_id) where pronto_em is not null;

alter table public.predios enable row level security;
create policy "jogador ve os proprios predios"
  on public.predios for select to authenticated
  using (exists (
    select 1 from public.cidades c
     where c.id = predios.cidade_id
       and c.jogador_id = (select auth.uid())
  ));

-- O cliente só lê; toda escrita passa pela Edge Function.
revoke all on public.temporadas, public.cidades, public.predios from anon, authenticated;
grant select on public.temporadas, public.cidades, public.predios to authenticated;
