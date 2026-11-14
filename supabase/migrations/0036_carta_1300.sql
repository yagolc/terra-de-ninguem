-- Cartas de pombo com até 1300 letras (eram 500). O mesmo limite está em BALANCEAMENTO.pombos.tamanhoTexto.
alter table public.cartas drop constraint cartas_texto_check;
alter table public.cartas add constraint cartas_texto_check check (char_length(texto) <= 1300);
