-- Monopólio comercial aberto a todos: quem controlar todas as cidades livres por 12 h seguidas vence a temporada.
-- Deixa de ser objetivo secreto; o fim da temporada ganha o motivo 'monopolio'.

alter table public.temporadas drop constraint temporadas_motivo_fim_check;
alter table public.temporadas
  add constraint temporadas_motivo_fim_check check (motivo_fim in ('objetivo', 'prazo', 'monopolio'));
