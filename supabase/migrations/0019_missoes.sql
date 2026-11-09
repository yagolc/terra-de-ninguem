-- Missões de início: quais recompensas o jogador já pegou nesta temporada (ids de `TIPOS_MISSAO` nas regras).
-- Só a função `cidade` (resgatar_missao) grava; o jogador lê a própria cidade pelo RLS que já existe.
alter table public.cidades add column missoes text[] not null default '{}';
