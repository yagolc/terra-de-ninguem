-- Épico 5: tropas paradas nos territórios e fila de treino do quartel.

-- ---------------------------------------------------------------------------
-- tropas: uma linha por (território, dono). dono_id nulo = bárbaros do território neutro.
-- Várias linhas no mesmo território permitem reforços de aliados (Fase 2).
-- ---------------------------------------------------------------------------
create table public.tropas (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  territorio_id  uuid not null references public.territorios (id) on delete cascade,
  dono_id        uuid references public.jogadores (id) on delete cascade,
  lanceiro       int not null default 0 check (lanceiro >= 0),
  arqueiro       int not null default 0 check (arqueiro >= 0),
  cavalaria      int not null default 0 check (cavalaria >= 0),
  unique nulls not distinct (territorio_id, dono_id)
);

create index tropas_dono on public.tropas (dono_id, temporada_id);
create index tropas_temporada on public.tropas (temporada_id);

-- Sigilo (GDD): cada jogador só vê as próprias tropas; bárbaros e tropas alheias ficam ocultos.
alter table public.tropas enable row level security;
create policy "jogador ve as proprias tropas"
  on public.tropas for select to authenticated
  using (dono_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- filas_treino: lotes treinados um depois do outro; entram em `tropas` quando pronto_em passa.
-- ---------------------------------------------------------------------------
create table public.filas_treino (
  id            uuid primary key default gen_random_uuid(),
  cidade_id     uuid not null references public.cidades (id) on delete cascade,
  tipo_unidade  text not null check (tipo_unidade in ('lanceiro', 'arqueiro', 'cavalaria')),
  quantidade    int not null check (quantidade > 0),
  pronto_em     timestamptz not null,
  criado_em     timestamptz not null default now()
);

create index filas_treino_cidade on public.filas_treino (cidade_id, pronto_em);

alter table public.filas_treino enable row level security;
create policy "jogador ve a propria fila"
  on public.filas_treino for select to authenticated
  using (exists (
    select 1 from public.cidades c
     where c.id = filas_treino.cidade_id
       and c.jogador_id = (select auth.uid())
  ));

revoke all on public.tropas, public.filas_treino from anon, authenticated;
grant select on public.tropas, public.filas_treino to authenticated;

-- ---------------------------------------------------------------------------
-- Bárbaros da temporada ativa, a partir da guarnição gerada com o mapa (Épico 4).
-- Próximas temporadas: o script `temporada:nova` já cria as tropas bárbaras.
-- ---------------------------------------------------------------------------
insert into public.tropas (temporada_id, territorio_id, dono_id, lanceiro, arqueiro, cavalaria)
select t.temporada_id, t.id, null,
       coalesce((t.guarnicao_inicial ->> 'lanceiro')::int, 0),
       coalesce((t.guarnicao_inicial ->> 'arqueiro')::int, 0),
       coalesce((t.guarnicao_inicial ->> 'cavalaria')::int, 0)
  from public.territorios t
  join public.temporadas s on s.id = t.temporada_id and s.status = 'ativa'
 where t.dono_id is null
   and coalesce((t.guarnicao_inicial ->> 'lanceiro')::int, 0)
     + coalesce((t.guarnicao_inicial ->> 'arqueiro')::int, 0)
     + coalesce((t.guarnicao_inicial ->> 'cavalaria')::int, 0) > 0;
