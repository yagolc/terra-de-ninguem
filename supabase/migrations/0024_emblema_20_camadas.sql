-- Emblema do perfil: até 20 camadas (eram 12). O limite das regras é `LIMITES_EMBLEMA.camadas`.
alter table public.jogadores drop constraint jogadores_emblema_check;
alter table public.jogadores
  add constraint jogadores_emblema_check
  check (jsonb_typeof(emblema) = 'array' and jsonb_array_length(emblema) <= 20);
