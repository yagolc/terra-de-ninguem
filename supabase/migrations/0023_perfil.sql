-- Perfil do jogador: bandeira (segunda cor, padrão e emblema; a cor principal já existe) e descrição. Público para
-- quem está logado, como o resto de `jogadores`; só a função `cidade` (ação `salvar_perfil`) grava. Os valores
-- válidos ficam nas regras (`perfil.ts`, `emblema.ts`); aqui só o formato, para as listas crescerem sem migration.
-- O emblema é uma lista de até 12 camadas: { forma, x, y, escala, rotacao, cor, espelhar }.
alter table public.jogadores
  add column cor_secundaria text check (cor_secundaria ~ '^#[0-9a-f]{6}$'),
  add column padrao         text not null default 'lisa' check (padrao ~ '^[a-z_]{1,20}$'),
  add column emblema        jsonb not null default '[]'
                            check (jsonb_typeof(emblema) = 'array' and jsonb_array_length(emblema) <= 12),
  add column descricao      text not null default '' check (char_length(descricao) <= 280);

-- Estatísticas do perfil, de qualquer jogador:
--   temporadas: cada temporada em que fundou cidade, com raça, colocação e números do placar (públicos);
--   rivalidades: vitórias e derrotas contra cada jogador, só de temporadas encerradas, para não revelar quem
--   está guerreando com quem na temporada em andamento.
create function public.perfil_jogador(p_jogador uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with dele as (
    select t.id, t.numero, t.status, t.motivo_fim, t.vencedor_id, c.raca
      from public.cidades c
      join public.temporadas t on t.id = c.temporada_id
     where c.jogador_id = p_jogador
  ),
  ranking as (
    select p.temporada_id, p.jogador_id, p.territorios, p.populacao, p.vitorias, p.pontos,
           rank() over (partition by p.temporada_id order by p.pontos desc) as posicao,
           count(*) over (partition by p.temporada_id) as participantes
      from public.placar p
  ),
  batalhas as (
    select case when r.atacante_id = p_jogador then r.defensor_id else r.atacante_id end as rival_id,
           (r.atacante_id = p_jogador and r.vencedor = 'atacante') or (r.defensor_id = p_jogador and r.vencedor = 'defensor') as venceu
      from public.relatorios r
      join public.temporadas t on t.id = r.temporada_id and t.status = 'encerrada'
     where (r.atacante_id = p_jogador or r.defensor_id = p_jogador)
       and r.defensor_id is not null
       and r.atacante_id <> r.defensor_id
       and r.vencedor in ('atacante', 'defensor')
  ),
  rivais as (
    select rival_id, count(*) filter (where venceu) as vitorias, count(*) filter (where not venceu) as derrotas
      from batalhas
     group by rival_id
  )
  select jsonb_build_object(
    'temporadas', coalesce((
      select jsonb_agg(jsonb_build_object(
               'numero', d.numero,
               'status', d.status,
               'raca', d.raca,
               'venceu', d.vencedor_id is not distinct from p_jogador,
               'motivo_fim', d.motivo_fim,
               'posicao', r.posicao,
               'participantes', r.participantes,
               'pontos', r.pontos,
               'territorios', r.territorios,
               'populacao', r.populacao,
               'vitorias', r.vitorias
             ) order by d.numero desc)
        from dele d
        left join ranking r on r.temporada_id = d.id and r.jogador_id = p_jogador
    ), '[]'::jsonb),
    'rivalidades', coalesce((
      select jsonb_agg(jsonb_build_object('jogador_id', v.rival_id, 'vitorias', v.vitorias, 'derrotas', v.derrotas)
             order by v.vitorias + v.derrotas desc, v.vitorias desc)
        from rivais v
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.perfil_jogador(uuid) from public, anon;
grant execute on function public.perfil_jogador(uuid) to authenticated;
