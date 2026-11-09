-- Rios e cordilheiras (gerador: `escolherBarreiras`): territórios vizinhos que não são fronteira, porque não dá
-- para atravessar. As regras só olham `fronteiras`; esta tabela serve para desenhar o mapa. Pública, só leitura.
create table public.barreiras (
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  territorio_a   uuid not null references public.territorios (id) on delete cascade,
  territorio_b   uuid not null references public.territorios (id) on delete cascade,
  tipo           text not null check (tipo in ('rio', 'montanha')),
  primary key (territorio_a, territorio_b),
  check (territorio_a < territorio_b)
);

create index barreiras_temporada on public.barreiras (temporada_id);

alter table public.barreiras enable row level security;
create policy "barreiras visiveis para logados"
  on public.barreiras for select to authenticated
  using (true);

revoke all on public.barreiras from anon, authenticated;
grant select on public.barreiras to authenticated;
