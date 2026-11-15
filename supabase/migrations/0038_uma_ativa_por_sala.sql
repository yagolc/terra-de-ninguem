-- Salas, segunda parte: uma temporada ativa **por sala** e o número da temporada contado em cada sala.
-- Pode ir junto com a 0037: a segunda temporada ativa só nasce pela função `salas`, publicada junto com as versões
-- da `cidade` e da `resolver-marchas` que sabem escolher a sala. Não crie sala antes de publicar as três.

drop index public.temporadas_uma_ativa;
create unique index temporadas_uma_ativa_por_sala on public.temporadas (sala_id) where status = 'ativa';

alter table public.temporadas drop constraint temporadas_numero_key;
alter table public.temporadas add constraint temporadas_numero_por_sala unique (sala_id, numero);
