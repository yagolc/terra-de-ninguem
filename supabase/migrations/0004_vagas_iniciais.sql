-- Posições iniciais planejadas pelo gerador. Quem se cadastra depois da criação da temporada
-- ocupa primeiro uma vaga inicial livre (equilibrada com as outras), não um território qualquer.
alter table public.territorios add column vaga_inicial boolean not null default false;

grant select (vaga_inicial) on public.territorios to authenticated;
