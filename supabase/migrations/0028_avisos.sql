-- Avisos no celular (notificações push). Cada aparelho que ativa os avisos vira uma inscrição (o endereço do serviço
-- de push do navegador e as chaves para cifrar), com os tipos que quer receber. Pertence ao jogador e atravessa
-- temporadas, como `jogadores`: é do aparelho, não da partida. Só a função `cidade` grava (inscrever, mudar tipos,
-- cancelar); o jogador lê as dele para a tela saber o que está ligado.
create table public.inscricoes_avisos (
  id            uuid primary key default gen_random_uuid(),
  jogador_id    uuid not null references public.jogadores (id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  tipos         text[] not null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index inscricoes_avisos_jogador on public.inscricoes_avisos (jogador_id);

alter table public.inscricoes_avisos enable row level security;
create policy "jogador le as proprias inscricoes de avisos"
  on public.inscricoes_avisos for select to authenticated
  using (jogador_id = (select auth.uid()));
revoke all on public.inscricoes_avisos from anon, authenticated;
grant select on public.inscricoes_avisos to authenticated;

-- O agendador (resolver-marchas, a cada minuto) procura o que ainda não foi avisado e marca. Tudo o que já existe
-- conta como avisado, para não chegar uma enxurrada de avisos antigos.
alter table public.relatorios add column avisado boolean not null default false;
update public.relatorios set avisado = true;
create index relatorios_a_avisar on public.relatorios (criado_em) where not avisado;

-- A torre do dono do destino viu a marcha (só marchas alheias para território com torre pronta).
alter table public.marchas add column avisada_torre boolean not null default false;
update public.marchas set avisada_torre = true;

-- Chegada da carta ao destinatário e resposta à proposta para quem mandou.
alter table public.cartas add column avisada boolean not null default false;
alter table public.cartas add column resposta_avisada boolean not null default false;
update public.cartas set avisada = true, resposta_avisada = true;
create index cartas_a_avisar on public.cartas (chega_em) where not avisada;

-- Horda que saiu (para o dono do alvo) e horda que atacou (para o defensor).
alter table public.hordas add column avisada boolean not null default false;
alter table public.hordas add column resultado_avisado boolean not null default false;
update public.hordas set avisada = true, resultado_avisado = true;

-- Início do relógio do objetivo já avisado (para todos da temporada).
alter table public.placar add column objetivo_avisado timestamptz;
update public.placar set objetivo_avisado = objetivo_desde;
