-- Feedback dos jogadores (aba Feedback): relatos de bug e sugestões, como num rastreador de problemas. Cada relato
-- tem número (#12), tipo, área, gravidade (bug), passos, esperado e aconteceu, o contexto do aparelho (navegador,
-- tela, versão do site), status e a resposta do organizador. Todos os jogadores veem tudo e votam (👍 "também
-- quero" / "também aconteceu comigo"), para não repetir. Atravessa temporadas, como `jogadores`.
-- Só a função `cidade` grava: `enviar_reporte`, `votar_reporte` e, para quem está em `organizadores`, `atualizar_reporte`.

create table public.reportes (
  id              uuid primary key default gen_random_uuid(),
  numero          integer generated always as identity unique,
  jogador_id      uuid not null references public.jogadores (id) on delete cascade,
  tipo            text not null check (tipo in ('bug', 'sugestao')),
  area            text not null check (area ~ '^[a-z_]{1,20}$'),
  gravidade       text check (gravidade in ('baixa', 'media', 'alta', 'critica')),
  titulo          text not null check (char_length(titulo) between 1 and 80),
  descricao       text not null default '' check (char_length(descricao) <= 2000),
  passos          text not null default '' check (char_length(passos) <= 2000),
  esperado        text not null default '' check (char_length(esperado) <= 2000),
  aconteceu       text not null default '' check (char_length(aconteceu) <= 2000),
  -- Navegador, sistema, tamanho da tela, versão do site e aba de onde veio (montado pelo site).
  contexto        jsonb not null default '{}' check (jsonb_typeof(contexto) = 'object' and pg_column_size(contexto) <= 4000),
  status          text not null default 'novo'
                  check (status in ('novo', 'em_analise', 'planejado', 'em_andamento', 'resolvido', 'nao_sera_feito', 'duplicado')),
  resposta        text check (char_length(resposta) <= 1000),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  -- Avisos no celular: relato novo para os organizadores, mudança de status para quem relatou.
  avisado         boolean not null default false,
  status_avisado  boolean not null default true
);

create index reportes_jogador_criado on public.reportes (jogador_id, criado_em desc);

alter table public.reportes enable row level security;
create policy "reportes visiveis para logados"
  on public.reportes for select to authenticated
  using (true);
revoke all on public.reportes from anon, authenticated;
grant select on public.reportes to authenticated;

create table public.votos_reportes (
  reporte_id uuid not null references public.reportes (id) on delete cascade,
  jogador_id uuid not null references public.jogadores (id) on delete cascade,
  criado_em  timestamptz not null default now(),
  primary key (reporte_id, jogador_id)
);

alter table public.votos_reportes enable row level security;
create policy "votos de reportes visiveis para logados"
  on public.votos_reportes for select to authenticated
  using (true);
revoke all on public.votos_reportes from anon, authenticated;
grant select on public.votos_reportes to authenticated;

-- O site pergunta se quem está logado é organizador (para mostrar os controles de status). Só responde sobre si.
create function public.sou_organizador()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.organizadores where jogador_id = (select auth.uid()));
$$;

revoke all on function public.sou_organizador() from public, anon;
grant execute on function public.sou_organizador() to authenticated;
