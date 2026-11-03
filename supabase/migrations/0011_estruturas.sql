-- Estruturas dos territórios: torre de vigia, paliçada e entreposto (uma por território).
-- São construídas pela função `cidade` (construir_estrutura) e apagadas pelo resolver-marchas quando o
-- território é conquistado.

create table public.estruturas (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  territorio_id  uuid not null unique references public.territorios (id) on delete cascade,
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  tipo           text not null check (tipo in ('torre', 'palicada', 'entreposto')),
  -- Antes disso a estrutura está em construção e não tem efeito.
  pronto_em      timestamptz not null,
  criado_em      timestamptz not null default now()
);

create index estruturas_jogador on public.estruturas (jogador_id, temporada_id);

-- Estruturas se veem de longe: qualquer jogador logado enxerga todas no mapa. Ninguém grava direto.
alter table public.estruturas enable row level security;
create policy "estruturas visiveis para logados"
  on public.estruturas for select to authenticated
  using (true);

revoke all on public.estruturas from anon, authenticated;
grant select on public.estruturas to authenticated;

-- Torre de vigia: o dono vê as marchas alheias que vão para um território dele com torre pronta.
-- As marchas continuam secretas pelo RLS; esta função entrega só essas, sem a composição do exército
-- (o total de soldados basta; a composição é trabalho do batedor).
create function public.marchas_vistas_pela_torre()
returns table (
  id          uuid,
  jogador_id  uuid,
  origem_id   uuid,
  destino_id  uuid,
  tipo        text,
  soldados    int,
  chegada_em  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.id, m.jogador_id, m.origem_id, m.destino_id, m.tipo,
         (m.lanceiro + m.arqueiro + m.cavalaria)::int, m.chegada_em
    from public.marchas m
    join public.territorios t on t.id = m.destino_id
    join public.estruturas e on e.territorio_id = m.destino_id
   where m.status = 'a_caminho'
     and m.tipo in ('saque', 'conquista', 'reconhecimento')
     and m.jogador_id <> (select auth.uid())
     and t.dono_id = (select auth.uid())
     and e.jogador_id = (select auth.uid())
     and e.tipo = 'torre'
     and e.pronto_em <= now();
$$;

revoke all on function public.marchas_vistas_pela_torre() from public, anon;
grant execute on function public.marchas_vistas_pela_torre() to authenticated;
