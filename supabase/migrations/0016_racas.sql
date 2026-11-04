-- Raças e herdeiro do trono (temporada 3).
-- A raça é escolhida ao fundar a cidade e vale a temporada toda; cidades de temporadas antigas ficam sem raça.
-- A Guarda Real são lanceiros do herdeiro (vencedor da temporada anterior) que defendem a cidade dele fora
-- da população; morrem em batalha e não voltam. Gravadas só pelas Edge Functions.

alter table public.cidades
  add column raca text check (raca in ('humano', 'elfo', 'orc', 'anao')),
  add column guarda_real int not null default 0 check (guarda_real >= 0);

-- A raça de cada jogador é pública (mapa, placar e "velha rixa"), mas a cidade não: o RLS de `cidades` só
-- mostra a própria. Esta função entrega só jogador e raça da temporada pedida.
create function public.racas_na_temporada(p_temporada uuid)
returns table (
  jogador_id  uuid,
  raca        text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.jogador_id, c.raca from public.cidades c where c.temporada_id = p_temporada;
$$;

revoke all on function public.racas_na_temporada(uuid) from public, anon;
grant execute on function public.racas_na_temporada(uuid) to authenticated;
