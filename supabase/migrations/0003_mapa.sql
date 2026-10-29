-- Épico 4: mapa da temporada (regiões, territórios e fronteiras), gerado por
-- `npm run temporada:nova` a partir de uma semente. O mapa é público para quem está logado.

alter table public.temporadas add column semente bigint;

-- ---------------------------------------------------------------------------
-- regioes: os "continentes" do mapa.
-- ---------------------------------------------------------------------------
create table public.regioes (
  id            uuid primary key default gen_random_uuid(),
  temporada_id  uuid not null references public.temporadas (id) on delete cascade,
  indice        int not null,
  nome          text not null,
  terreno       text not null check (terreno in ('planicie', 'floresta', 'montanha')),
  unique (temporada_id, indice)
);

-- ---------------------------------------------------------------------------
-- territorios: x e y (centro) e poligono (contorno) em léguas, para desenhar e medir marchas.
-- ---------------------------------------------------------------------------
create table public.territorios (
  id                 uuid primary key default gen_random_uuid(),
  temporada_id       uuid not null references public.temporadas (id) on delete cascade,
  regiao_id          uuid not null references public.regioes (id) on delete cascade,
  indice             int not null,
  nome               text not null,
  terreno            text not null check (terreno in ('planicie', 'floresta', 'montanha')),
  bonus_recurso      text not null check (bonus_recurso in ('comida', 'madeira', 'ouro')),
  x                  double precision not null,
  y                  double precision not null,
  poligono           jsonb not null,
  dono_id            uuid references public.jogadores (id) on delete set null,
  cidade_principal   boolean not null default false,
  -- Território inicial reservado para um jogador na criação da temporada.
  reservado_para     uuid references public.jogadores (id) on delete set null,
  -- Tropas bárbaras geradas com o mapa; viram linhas de tropas no Épico 5.
  guarnicao_inicial  jsonb not null default '{}',
  unique (temporada_id, indice)
);

create index territorios_temporada on public.territorios (temporada_id);
create index territorios_dono on public.territorios (dono_id) where dono_id is not null;
create index territorios_regiao on public.territorios (regiao_id);
create index territorios_reservado on public.territorios (reservado_para) where reservado_para is not null;

-- ---------------------------------------------------------------------------
-- fronteiras: pares de vizinhos, guardados uma vez só (a < b).
-- ---------------------------------------------------------------------------
create table public.fronteiras (
  temporada_id  uuid not null references public.temporadas (id) on delete cascade,
  territorio_a  uuid not null references public.territorios (id) on delete cascade,
  territorio_b  uuid not null references public.territorios (id) on delete cascade,
  primary key (territorio_a, territorio_b),
  check (territorio_a < territorio_b)
);

create index fronteiras_b on public.fronteiras (territorio_b);
create index fronteiras_temporada on public.fronteiras (temporada_id);

alter table public.cidades
  add constraint cidades_territorio_fk foreign key (territorio_id) references public.territorios (id) on delete set null;
create index cidades_territorio on public.cidades (territorio_id);

-- ---------------------------------------------------------------------------
-- RLS: todos os logados veem o mapa inteiro (donos e cores incluídos). Escrita só pelo servidor.
-- A guarnição inicial dos bárbaros fica oculta: ninguém vê a força de um território neutro.
-- ---------------------------------------------------------------------------
alter table public.regioes enable row level security;
alter table public.territorios enable row level security;
alter table public.fronteiras enable row level security;

create policy "mapa visivel para logados" on public.regioes for select to authenticated using (true);
create policy "mapa visivel para logados" on public.territorios for select to authenticated using (true);
create policy "mapa visivel para logados" on public.fronteiras for select to authenticated using (true);

revoke all on public.regioes, public.territorios, public.fronteiras from anon, authenticated;
grant select on public.regioes, public.fronteiras to authenticated;
grant select (id, temporada_id, regiao_id, indice, nome, terreno, bonus_recurso, x, y, poligono, dono_id,
              cidade_principal, reservado_para)
  on public.territorios to authenticated;
