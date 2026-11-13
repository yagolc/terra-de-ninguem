-- Objetivo cumprido não encerra mais a temporada na hora: o jogador precisa mantê-lo por algumas horas seguidas
-- (regras: `relogioDoObjetivo`, `BALANCEAMENTO.objetivos.segurarHoras`). O relógio fica no placar, que é público:
-- todos veem quem está segurando e quando vence, mas o tipo do objetivo continua secreto. Enquanto o relógio corre,
-- o jogador fica sem escudo. Gravado só pelo resolver-marchas (atualizarPlacar).
alter table public.placar add column objetivo_desde timestamptz;
