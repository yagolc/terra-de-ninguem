-- Estruturas alheias ficam secretas: os outros jogadores só sabem que o território tem "alguma" estrutura.
-- Para descobrir qual é (e se já está pronta), é preciso mandar um batedor.

drop policy "estruturas visiveis para logados" on public.estruturas;
create policy "jogador ve as proprias estruturas"
  on public.estruturas for select to authenticated
  using (jogador_id = (select auth.uid()));

-- Mapa: todas as estruturas da temporada, com tipo e prazo só nas do próprio jogador (nas outras, nulos).
create function public.estruturas_no_mapa(p_temporada uuid)
returns table (
  territorio_id  uuid,
  tipo           text,
  pronto_em      timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.territorio_id,
         case when e.jogador_id = (select auth.uid()) then e.tipo end,
         case when e.jogador_id = (select auth.uid()) then e.pronto_em end
    from public.estruturas e
   where e.temporada_id = p_temporada;
$$;

revoke all on function public.estruturas_no_mapa(uuid) from public, anon;
grant execute on function public.estruturas_no_mapa(uuid) to authenticated;

-- O batedor anota a estrutura que viu (nula se não havia) e se ela já estava pronta.
alter table public.reconhecimentos
  add column estrutura text check (estrutura in ('torre', 'palicada', 'entreposto')),
  add column estrutura_pronta boolean not null default false;
