-- Reconhecimento: batedores que observam um território vizinho e voltam com as informações.

alter table public.marchas drop constraint marchas_tipo_check;
alter table public.marchas add constraint marchas_tipo_check
  check (tipo in ('saque', 'conquista', 'retorno', 'movimento', 'reconhecimento'));

create table public.reconhecimentos (
  id             uuid primary key default gen_random_uuid(),
  temporada_id   uuid not null references public.temporadas (id) on delete cascade,
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  territorio_id  uuid not null references public.territorios (id) on delete cascade,
  -- Quem era o dono quando o batedor chegou (nulo = bárbaros).
  dono_id        uuid references public.jogadores (id) on delete set null,
  terreno        text not null,
  muralha        int not null default 0,
  lanceiro       int not null default 0,
  arqueiro       int not null default 0,
  cavalaria      int not null default 0,
  -- Quando o batedor viu (chegada) e quando o jogador fica sabendo (batedor de volta).
  observado_em   timestamptz not null,
  disponivel_em  timestamptz not null,
  lido           boolean not null default false
);

create index reconhecimentos_jogador on public.reconhecimentos (jogador_id, temporada_id, disponivel_em desc);

-- Só o dono do batedor vê, e só depois que o batedor voltou.
alter table public.reconhecimentos enable row level security;
create policy "batedor volta com as informacoes"
  on public.reconhecimentos for select to authenticated
  using (jogador_id = (select auth.uid()) and disponivel_em <= now());

revoke all on public.reconhecimentos from anon, authenticated;
grant select on public.reconhecimentos to authenticated;
