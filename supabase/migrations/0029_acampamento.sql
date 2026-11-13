-- Acampamento militar: quarta estrutura de território (só em território conquistado, uma por jogador; regras em
-- packages/regras/src/estruturas.ts). O Quartel da cidade treina e o lote fica pronto no acampamento: `territorio_id`
-- do lote (nulo = território da cidade). Se o acampamento for destruído ou o território conquistado, os lotes voltam
-- a ficar prontos na cidade (a função `cidade` e o resolver-marchas zeram o `territorio_id`).
alter table public.estruturas drop constraint estruturas_tipo_check;
alter table public.estruturas add constraint estruturas_tipo_check
  check (tipo in ('torre', 'palicada', 'entreposto', 'acampamento'));

-- O batedor também pode ver um acampamento.
alter table public.reconhecimentos drop constraint reconhecimentos_estrutura_check;
alter table public.reconhecimentos add constraint reconhecimentos_estrutura_check
  check (estrutura in ('torre', 'palicada', 'entreposto', 'acampamento'));

alter table public.filas_treino add column territorio_id uuid references public.territorios (id) on delete set null;
