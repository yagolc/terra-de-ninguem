// Textos para o jogador de cada motivo de recusa. Servidor e interface usam os mesmos.
import type { MotivoRecusaEvolucao } from './predios.ts';
import type { MotivoRecusaAlocacao } from './producao.ts';
import type { MotivoRecusaTreino } from './treino.ts';

export const MENSAGENS_EVOLUCAO: Record<MotivoRecusaEvolucao, string> = {
  nivel_maximo: 'Este prédio já está no nível máximo.',
  acima_do_centro: 'Evolua o Centro da Cidade primeiro.',
  construcao_em_andamento: 'Já há uma obra em andamento. Só uma por vez.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_ALOCACAO: Record<MotivoRecusaAlocacao, string> = {
  valor_invalido: 'Quantidade de trabalhadores inválida.',
  acima_das_vagas: 'Não há vagas para tantos trabalhadores. Evolua o prédio.',
  populacao_insuficiente: 'Não há habitantes livres suficientes.',
};

export const MENSAGENS_TREINO: Record<MotivoRecusaTreino, string> = {
  quantidade_invalida: 'Quantidade de tropas inválida.',
  sem_quartel: 'Construa um Quartel primeiro.',
  recursos_insuficientes: 'Recursos insuficientes.',
  populacao_insuficiente: 'Não há habitantes livres suficientes.',
};
