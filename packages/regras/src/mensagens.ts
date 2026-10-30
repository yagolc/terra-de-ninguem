// Textos para o jogador de cada motivo de recusa. Servidor e interface usam os mesmos.
import type { MotivoRecusaAtaque, MotivoRecusaMovimento } from './ataques.ts';
import type { MotivoRecusaEvolucao } from './predios.ts';
import type { MotivoRecusaAlocacao } from './producao.ts';
import type { MotivoRecusaTreino } from './treino.ts';

export const MENSAGENS_EVOLUCAO: Record<MotivoRecusaEvolucao, string> = {
  nivel_maximo: 'Este prédio já está no nível máximo.',
  acima_do_centro: 'Evolua o Centro da Cidade primeiro.',
  fila_cheia: 'A fila de obras está cheia (até 3). Espere uma terminar.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_ALOCACAO: Record<MotivoRecusaAlocacao, string> = {
  valor_invalido: 'Quantidade de trabalhadores inválida.',
  acima_das_vagas: 'Não há vagas para tantos trabalhadores. Evolua o prédio.',
  populacao_insuficiente: 'Não há habitantes livres suficientes.',
};

export const MENSAGENS_TREINO: Record<MotivoRecusaTreino, string> = {
  quantidade_invalida: 'Quantidade de tropas inválida.',
  fila_cheia: 'A fila do quartel está cheia. Espere um lote terminar.',
  sem_quartel: 'Construa um Quartel primeiro.',
  recursos_insuficientes: 'Recursos insuficientes.',
  populacao_insuficiente: 'Não há habitantes livres suficientes.',
};

export const MENSAGENS_ATAQUE: Record<MotivoRecusaAtaque, string> = {
  origem_invalida: 'As tropas precisam sair de um território seu.',
  nao_vizinho: 'Só dá para atacar um território vizinho ao de onde as tropas saem.',
  alvo_proprio: 'Esse território já é seu.',
  sem_tropas: 'Escolha quantas tropas vão marchar.',
  tropas_insuficientes: 'Você não tem tantas tropas nesse território.',
  cidade_nao_conquistavel: 'Cidades principais podem ser saqueadas, mas nunca conquistadas.',
  protecao_iniciante: 'Nas primeiras 48 horas da temporada ninguém ataca jogadores. Os territórios neutros já podem ser atacados.',
  alvo_com_escudo: 'Esse jogador perdeu uma defesa há pouco e está protegido por um escudo.',
};

export const MENSAGENS_MOVIMENTO: Record<MotivoRecusaMovimento, string> = {
  origem_invalida: 'As tropas precisam sair de um território seu.',
  destino_invalido: 'Só dá para mover tropas para um território seu. Para tomar outro, use Atacar.',
  mesmo_territorio: 'Escolha outro território como destino.',
  sem_caminho: 'O destino não está ligado à origem por territórios seus: as tropas teriam de atravessar terra alheia.',
  sem_tropas: 'Escolha quantas tropas vão se mover.',
  tropas_insuficientes: 'Você não tem tantas tropas nesse território.',
};
