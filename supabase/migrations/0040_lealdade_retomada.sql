-- Povoado retomado pelo último dono que o perdeu: o povo volta ao antigo senhor (regras: `lealDesdeNaConquista` em
-- packages/regras/src/povoados.ts). Na conquista de um jogador, o resolver-marchas guarda quem perdeu e a lealdade
-- que ele tinha; se ele mesmo retoma, a lealdade volta a ser aquela (leal na hora, se já era). Virar neutro (horda,
-- rebelião) apaga a lembrança: quem retoma dos bárbaros já fica leal na hora.
alter table public.povoados
  add column dono_anterior_id uuid references public.jogadores (id) on delete set null,
  add column leal_anterior    timestamptz;

-- A regra vale para o único caso que já tinha acontecido na temporada 5: a vila do Monte Escuro, conquistada dos
-- bárbaros pela dona atual (leal desde então), tomada por outro jogador e retomada por ela. Volta a ser leal desde a
-- primeira conquista.
update public.povoados p
   set leal_desde = r.criado_em
  from public.territorios t, public.relatorios r
 where t.id = '56a0078f-e83e-4f69-b4e6-bce91b55bff9'
   and p.territorio_id = t.id
   and r.territorio_id = t.id and r.conquistou and r.defensor_id is null and r.atacante_id = t.dono_id;
