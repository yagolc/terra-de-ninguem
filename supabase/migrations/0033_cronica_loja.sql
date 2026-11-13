-- Loja: nome na Crônica. Quem compra o item `cronica` aparece no capítulo da temporada (escrito à mão pelo
-- organizador) e pode contar como quer ser lembrado (`pedido`). O organizador lê pelo SQL:
--   select * from public.pedidos_cronica();             -- temporada ativa (ou a última)
--   select * from public.pedidos_cronica(5);            -- temporada de número 5
alter table public.itens_comprados add column pedido text check (char_length(pedido) <= 200);

create function public.pedidos_cronica(p_numero integer default null)
returns table (temporada integer, jogador text, raca text, pedido text, comprado_em timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select t.numero, j.nome, c.raca, i.pedido, i.criado_em
    from public.itens_comprados i
    join public.temporadas t on t.id = i.temporada_id
    join public.jogadores j on j.id = i.jogador_id
    left join public.cidades c on c.temporada_id = i.temporada_id and c.jogador_id = i.jogador_id
   where i.item = 'cronica'
     and t.numero = coalesce(p_numero, (select max(numero) from public.temporadas))
   order by i.criado_em;
$$;

revoke execute on function public.pedidos_cronica(integer) from public, anon, authenticated;
grant  execute on function public.pedidos_cronica(integer) to service_role;
