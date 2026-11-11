// Nome do jogador: escolhido ao fundar a cidade e trocável durante a temporada. Vale para todas as temporadas.

/** Limites do nome (a tabela `jogadores` tem o mesmo `check`). */
export const TAMANHO_NOME = { minimo: 1, maximo: 24 } as const;

export type MotivoRecusaNome = 'nome_vazio' | 'nome_longo' | 'nome_em_uso';

/** Tira espaços das pontas e junta espaços repetidos. */
export function limparNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

/** Forma de comparar nomes: sem maiúsculas, acentos nem espaços extras ("Dudú" e "dudu" são o mesmo nome). */
export function chaveDoNome(nome: string): string {
  return limparNome(nome)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/**
 * Confere o nome novo: tamanho e se nenhum outro jogador já usa o mesmo (para ninguém se passar por outro).
 * `nomesDosOutros` não inclui o nome atual do próprio jogador.
 */
export function verificarNomeJogador(
  nome: string,
  nomesDosOutros: readonly string[],
): { ok: true; nome: string } | { ok: false; motivo: MotivoRecusaNome } {
  const limpo = limparNome(nome);
  if (limpo.length < TAMANHO_NOME.minimo) return { ok: false, motivo: 'nome_vazio' };
  if (limpo.length > TAMANHO_NOME.maximo) return { ok: false, motivo: 'nome_longo' };
  const chave = chaveDoNome(limpo);
  if (nomesDosOutros.some((outro) => chaveDoNome(outro) === chave)) return { ok: false, motivo: 'nome_em_uso' };
  return { ok: true, nome: limpo };
}
