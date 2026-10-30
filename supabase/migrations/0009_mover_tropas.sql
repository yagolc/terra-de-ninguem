-- Movimento de tropas entre territórios do próprio jogador (sem batalha).
alter table public.marchas drop constraint marchas_tipo_check;
alter table public.marchas add constraint marchas_tipo_check
  check (tipo in ('saque', 'conquista', 'retorno', 'movimento'));
