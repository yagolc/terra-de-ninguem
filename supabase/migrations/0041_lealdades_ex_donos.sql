-- O povoado lembra a lealdade de todos os ex-donos (regras: `conquistaDePovoado` em packages/regras/src/povoados.ts),
-- não só do último que o perdeu (migration 0040): quem já foi dono e retoma volta com a lealdade que tinha, mesmo
-- que o povoado tenha passado por outros no meio. `lealdades`: id do jogador → `leal_desde` em ms quando ele perdeu.
-- Horda e rebelião (que o levam para os bárbaros) apagam a memória. `dono_anterior_id` e `leal_anterior` ficam
-- sem uso.
alter table public.povoados add column lealdades jsonb not null default '{}'::jsonb;

-- O que a 0040 já guardava vira o começo da memória.
update public.povoados
   set lealdades = jsonb_build_object(dono_anterior_id::text, (extract(epoch from leal_anterior) * 1000)::bigint)
 where dono_anterior_id is not null and leal_anterior is not null;

-- Povoados da temporada ativa retomados por quem os conquistou dos bárbaros, que os perdeu depois, sem horda nem
-- rebelião no meio, e que ainda não estão leais: com a regra nova, a lealdade volta a ser a da primeira conquista
-- (na temporada 5: Garganta do Lobo e Vale Sombrio).
update public.povoados p
   set leal_desde = primeira.criado_em
  from public.territorios t
  join public.temporadas tp on tp.id = t.temporada_id and tp.status = 'ativa'
  cross join lateral (
    select r.criado_em from public.relatorios r
     where r.territorio_id = t.id and r.conquistou and r.defensor_id is null and r.atacante_id = t.dono_id
     order by r.criado_em desc limit 1
  ) primeira
 where p.territorio_id = t.id
   and t.dono_id is not null
   and p.leal_desde > now()
   and exists (select 1 from public.relatorios r
                where r.territorio_id = t.id and r.conquistou and r.defensor_id = t.dono_id and r.criado_em > primeira.criado_em)
   and not exists (select 1 from public.hordas h
                    where h.territorio_id = t.id and h.conquistou and h.chegada_em > primeira.criado_em)
   and not exists (select 1 from public.rebelioes rb where rb.territorio_id = t.id and rb.criado_em > primeira.criado_em);
