-- Acesso militar: outra proposta que a carta pode levar, além do pacto de não agressão. Aceita, `pacto_ate`
-- marca até quando as tropas de cada um atravessam as terras do outro (movimento, ataque e batedor; a
-- validação fica na função `cidade`). Usa as mesmas colunas do pacto (horas_pacto de 1 a 12, resposta, pacto_ate).
alter table public.cartas drop constraint cartas_proposta_check;
alter table public.cartas add constraint cartas_proposta_check check (proposta in ('nao_agressao', 'acesso_militar'));
