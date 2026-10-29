-- Fila de obras: até 3 obras por cidade, feitas uma depois da outra (o limite fica nas regras).
-- Substitui predios.pronto_em, que só permitia uma obra por vez.

create table public.obras (
  id         uuid primary key default gen_random_uuid(),
  cidade_id  uuid not null references public.cidades (id) on delete cascade,
  tipo       text not null check (tipo in ('centro', 'casa', 'fazenda', 'serraria', 'mercado', 'armazem', 'quartel', 'muralha')),
  pronto_em  timestamptz not null,
  criado_em  timestamptz not null default now()
);

create index obras_cidade on public.obras (cidade_id, pronto_em);

alter table public.obras enable row level security;
create policy "jogador ve as proprias obras"
  on public.obras for select to authenticated
  using (exists (
    select 1 from public.cidades c
     where c.id = obras.cidade_id
       and c.jogador_id = (select auth.uid())
  ));

revoke all on public.obras from anon, authenticated;
grant select on public.obras to authenticated;

-- Obras em andamento passam para a tabela nova.
insert into public.obras (cidade_id, tipo, pronto_em)
select cidade_id, tipo, pronto_em from public.predios where pronto_em is not null;

drop index public.predios_uma_obra_por_cidade;
alter table public.predios drop column pronto_em;
