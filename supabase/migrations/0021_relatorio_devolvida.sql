-- Relatório de tropas que voltaram sem lutar: o alvo neutro virou de um jogador enquanto a marcha andava, ainda
-- na proteção de iniciante. Só o atacante o vê (defensor_id nulo). Sem vencedor, não conta como vitória em nada.
alter table public.relatorios drop constraint relatorios_tipo_check;
alter table public.relatorios add constraint relatorios_tipo_check check (tipo in ('saque', 'conquista', 'devolvida'));

alter table public.relatorios alter column vencedor drop not null;
alter table public.relatorios drop constraint relatorios_vencedor_check;
alter table public.relatorios add constraint relatorios_vencedor_check
  check (vencedor in ('atacante', 'defensor') or (tipo = 'devolvida' and vencedor is null));
