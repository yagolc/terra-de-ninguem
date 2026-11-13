-- Pets da cidade (comprados na loja como item `pet`, variante = o bicho). Cada jogador escolhe um para morar na
-- cidade na temporada. Um saque vencedor contra a cidade leva o pet (`mantido_por` passa a ser o sequestrador);
-- o dono recupera saqueando de volta, pagando o resgate em ouro que o sequestrador pedir (`resgate_ouro`) ou na
-- temporada nova (as linhas são por temporada). Público: todos veem os pets e os reféns no mapa.
-- Só a função `cidade` (escolher, pedir e pagar resgate, libertar) e o `resolver-marchas` (saque) gravam.

create table public.pets (
  temporada_id    uuid not null references public.temporadas (id) on delete cascade,
  dono_id         uuid not null references public.jogadores (id) on delete cascade,
  tipo            text not null check (tipo ~ '^[a-z_]{1,20}$'),
  -- Em que cidade o pet está: a do dono, ou a de quem sequestrou.
  mantido_por     uuid not null references public.jogadores (id) on delete cascade,
  sequestrado_em  timestamptz,
  -- Quem sequestrou por último (fica depois do resgate, para o aviso de pagamento).
  sequestrador_id uuid references public.jogadores (id) on delete set null,
  -- Resgate em ouro pedido pelo sequestrador (nulo: ainda não pediu).
  resgate_ouro    integer check (resgate_ouro between 1 and 5000),
  -- Aviso no celular de um acontecimento do resgate: preço pedido (para o dono), pago (para o sequestrador),
  -- libertado de graça (para o dono).
  evento          text check (evento in ('preco', 'pago', 'libertado')),
  evento_avisado  boolean not null default true,
  primary key (temporada_id, dono_id)
);

create index pets_mantido_por on public.pets (temporada_id, mantido_por);

alter table public.pets enable row level security;
create policy "pets visiveis para logados"
  on public.pets for select to authenticated
  using (true);
revoke all on public.pets from anon, authenticated;
grant select on public.pets to authenticated;
