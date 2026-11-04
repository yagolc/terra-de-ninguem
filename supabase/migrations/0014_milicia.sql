-- Milícia da cidade livre: lanceiros que defendem o dono atual sem ocupar população nem comer.
-- Entregues na primeira conquista; morrem nas batalhas como as outras tropas e se dispersam se a
-- cidade for tomada. Gravada só pela `resolver-marchas`.
alter table public.povoados add column milicia int not null default 0 check (milicia >= 0);
