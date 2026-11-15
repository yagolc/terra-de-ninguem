-- Salas: partidas em paralelo. Cada sala é uma mesa com a sua própria sequência de temporadas (mapa, placar,
-- objetivos, herdeiro e hordas). As temporadas de antes viram a Sala principal.
--
-- Esta migration só acrescenta: a trava "uma temporada ativa no jogo" (`temporadas_uma_ativa`) e o número único
-- de temporada continuam até a 0038. Nada muda para o código antigo: tudo o que existe fica na Sala principal.
-- Escrita só pelas Edge Functions (`salas`, `cidade`); o site só lê.

-- ---------------------------------------------------------------------------
-- salas
-- ---------------------------------------------------------------------------
create table public.salas (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null check (char_length(nome) between 1 and 40),
  principal         boolean not null default false,
  criador_id        uuid references public.jogadores (id) on delete set null,
  -- aberta: qualquer jogador entra até lotar; convite: só quem está em `salas_membros`.
  acesso            text not null default 'aberta' check (acesso in ('aberta', 'convite')),
  jogadores_maximo  int not null check (jogadores_maximo between 1 and 8),
  duracao_dias      int not null check (duracao_dias between 1 and 60),
  -- arquivada: some do menu de salas (as temporadas e o histórico ficam).
  status            text not null default 'aberta' check (status in ('aberta', 'arquivada')),
  criado_em         timestamptz not null default now()
);

create unique index salas_uma_principal on public.salas ((true)) where principal;
create unique index salas_nome_unico on public.salas (lower(nome));

-- A Sala principal tem id fixo: é o padrão de `temporadas.sala_id` e de quem não diz a sala (o site antigo).
insert into public.salas (id, nome, principal, acesso, jogadores_maximo, duracao_dias)
values ('00000000-0000-0000-0000-000000000001', 'Sala principal', true, 'aberta', 8, 21);

alter table public.salas enable row level security;
create policy "salas visiveis para logados" on public.salas for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- salas_membros: quem pode entrar numa sala por convite.
-- ---------------------------------------------------------------------------
create table public.salas_membros (
  sala_id        uuid not null references public.salas (id) on delete cascade,
  jogador_id     uuid not null references public.jogadores (id) on delete cascade,
  convidado_por  uuid references public.jogadores (id) on delete set null,
  criado_em      timestamptz not null default now(),
  primary key (sala_id, jogador_id)
);

create index salas_membros_jogador on public.salas_membros (jogador_id);

alter table public.salas_membros enable row level security;
create policy "membros visiveis para logados" on public.salas_membros for select to authenticated using (true);

revoke all on public.salas, public.salas_membros from anon, authenticated;
grant select on public.salas, public.salas_membros to authenticated;

-- ---------------------------------------------------------------------------
-- temporadas.sala_id: as que já existem são da Sala principal; o padrão mantém o `temporada:nova` antigo valendo.
-- ---------------------------------------------------------------------------
alter table public.temporadas
  add column sala_id uuid not null default '00000000-0000-0000-0000-000000000001'
    references public.salas (id) on delete cascade;

create index temporadas_sala on public.temporadas (sala_id, numero desc);

-- Transição: o site antigo (guardado no celular) procura "a" temporada ativa e quebraria com duas. Ele só vê a
-- Sala principal; o site novo manda o cabeçalho `x-terra-salas: 1` e vê todas. Sai depois da temporada 6.
drop policy "temporadas visiveis para logados" on public.temporadas;
create policy "temporadas visiveis para logados"
  on public.temporadas for select to authenticated
  using (
    sala_id = '00000000-0000-0000-0000-000000000001'
    -- nullif: numa conexão reaproveitada a configuração pode vir vazia, e '' não é JSON.
    or coalesce(nullif(current_setting('request.headers', true), '')::json ->> 'x-terra-salas', '') = '1'
  );

-- ---------------------------------------------------------------------------
-- Cor no mapa por sala. `jogadores.cor` vira a cor preferida; `cidades.cor` é a dela naquela partida (sem
-- repetir a de outro jogador da mesma temporada). Cidades antigas sem cor usam a preferida.
-- ---------------------------------------------------------------------------
alter table public.cidades add column cor text check (cor ~ '^#[0-9a-f]{6}$');

update public.cidades c
   set cor = lower(j.cor)
  from public.jogadores j, public.temporadas t
 where j.id = c.jogador_id and t.id = c.temporada_id and t.status = 'ativa'
   and j.cor ~* '^#[0-9a-f]{6}$';

-- Raça e cor de quem tem cidade na temporada (públicas; o RLS de `cidades` só mostra a própria).
create function public.cidades_na_temporada(p_temporada uuid)
returns table (
  jogador_id  uuid,
  raca        text,
  cor         text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.jogador_id, c.raca, coalesce(c.cor, j.cor)
    from public.cidades c
    join public.jogadores j on j.id = c.jogador_id
   where c.temporada_id = p_temporada;
$$;

revoke all on function public.cidades_na_temporada(uuid) from public, anon;
grant execute on function public.cidades_na_temporada(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Perfil: cada temporada diz de que sala é. A Sala principal vem primeiro (o site antigo pega a primeira ativa).
-- ---------------------------------------------------------------------------
create or replace function public.perfil_jogador(p_jogador uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with dele as (
    select t.id, t.numero, t.status, t.motivo_fim, t.vencedor_id, t.inicio, c.raca,
           s.id as sala_id, s.nome as sala, s.principal
      from public.cidades c
      join public.temporadas t on t.id = c.temporada_id
      join public.salas s on s.id = t.sala_id
     where c.jogador_id = p_jogador
  ),
  ranking as (
    select p.temporada_id, p.jogador_id, p.territorios, p.populacao, p.vitorias, p.pontos,
           rank() over (partition by p.temporada_id order by p.pontos desc) as posicao,
           count(*) over (partition by p.temporada_id) as participantes
      from public.placar p
  ),
  batalhas as (
    select case when r.atacante_id = p_jogador then r.defensor_id else r.atacante_id end as rival_id,
           (r.atacante_id = p_jogador and r.vencedor = 'atacante') or (r.defensor_id = p_jogador and r.vencedor = 'defensor') as venceu
      from public.relatorios r
      join public.temporadas t on t.id = r.temporada_id and t.status = 'encerrada'
     where (r.atacante_id = p_jogador or r.defensor_id = p_jogador)
       and r.defensor_id is not null
       and r.atacante_id <> r.defensor_id
       and r.vencedor in ('atacante', 'defensor')
  ),
  rivais as (
    select rival_id, count(*) filter (where venceu) as vitorias, count(*) filter (where not venceu) as derrotas
      from batalhas
     group by rival_id
  )
  select jsonb_build_object(
    'temporadas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'temporada_id', d.id,
               'numero', d.numero,
               'status', d.status,
               'sala_id', d.sala_id,
               'sala', d.sala,
               'principal', d.principal,
               'raca', d.raca,
               'venceu', d.vencedor_id is not distinct from p_jogador,
               'motivo_fim', d.motivo_fim,
               'posicao', r.posicao,
               'participantes', r.participantes,
               'pontos', r.pontos,
               'territorios', r.territorios,
               'populacao', r.populacao,
               'vitorias', r.vitorias
             ) order by d.principal desc, d.inicio desc)
        from dele d
        left join ranking r on r.temporada_id = d.id and r.jogador_id = p_jogador
    ), '[]'::jsonb),
    'rivalidades', coalesce((
      select jsonb_agg(jsonb_build_object('jogador_id', v.rival_id, 'vitorias', v.vitorias, 'derrotas', v.derrotas)
             order by v.vitorias + v.derrotas desc, v.vitorias desc)
        from rivais v
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------------
-- Crônica: só a Sala principal tem capítulos (o número é o da temporada dela).
-- ---------------------------------------------------------------------------
create or replace function public.pedidos_cronica(p_numero integer default null)
returns table (temporada integer, jogador text, raca text, pedido text, comprado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.numero, j.nome, c.raca, i.pedido, i.criado_em
    from public.itens_comprados i
    join public.temporadas t on t.id = i.temporada_id
    join public.jogadores j on j.id = i.jogador_id
    left join public.cidades c on c.temporada_id = i.temporada_id and c.jogador_id = i.jogador_id
   where i.item = 'cronica'
     and t.sala_id = '00000000-0000-0000-0000-000000000001'
     and t.numero = coalesce(p_numero, (
       select max(numero) from public.temporadas where sala_id = '00000000-0000-0000-0000-000000000001'))
   order by i.criado_em;
$$;

-- ---------------------------------------------------------------------------
-- Torre de vigia por sala: as marchas alheias vistas só da temporada pedida (o ⚠️ da aba Mapa é da sala aberta).
-- ---------------------------------------------------------------------------
create function public.marchas_vistas_na_temporada(p_temporada uuid)
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
   where m.temporada_id = p_temporada
     and m.status = 'a_caminho'
     and m.tipo in ('saque', 'conquista', 'reconhecimento')
     and m.jogador_id <> (select auth.uid())
     and t.dono_id = (select auth.uid())
     and e.jogador_id = (select auth.uid())
     and e.tipo = 'torre'
     and e.pronto_em <= now();
$$;

revoke all on function public.marchas_vistas_na_temporada(uuid) from public, anon;
grant execute on function public.marchas_vistas_na_temporada(uuid) to authenticated;
