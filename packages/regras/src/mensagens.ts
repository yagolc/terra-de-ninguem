// Textos para o jogador de cada motivo de recusa. Servidor e interface usam os mesmos.
import type { MotivoRecusaAtaque, MotivoRecusaMovimento } from './ataques.ts';
import type { MotivoRecusaCancelamento } from './cancelamento.ts';
import type { MotivoRecusaEstrada, MotivoRecusaEstrutura } from './estruturas.ts';
import type { MotivoRecusaMissao } from './missoes.ts';
import type { MotivoRecusaRecrutamento, MotivoRecusaTreinoHeroi } from './herois.ts';
import type { MotivoRecusaVila } from './povoados.ts';
import type { MotivoRecusaEvolucao } from './predios.ts';
import type { MotivoRecusaReconhecimento } from './reconhecimento.ts';
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

export const MENSAGENS_RECONHECIMENTO: Record<MotivoRecusaReconhecimento, string> = {
  origem_invalida: 'O batedor precisa sair de um território seu.',
  nao_vizinho: 'O batedor só alcança territórios vizinhos aos seus.',
  alvo_proprio: 'Esse território já é seu: você já sabe o que tem lá.',
  ouro_insuficiente: 'Falta ouro para pagar o batedor.',
};

export const MENSAGENS_ESTRUTURA: Record<MotivoRecusaEstrutura, string> = {
  territorio_invalido: 'Só dá para construir em territórios seus.',
  ja_tem_estrutura: 'Esse território já tem uma estrutura. É uma por território.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_ESTRADA: Record<MotivoRecusaEstrada, string> = {
  territorio_invalido: 'Só dá para fazer estrada em territórios seus.',
  ja_tem_estrada: 'Esse território já tem estrada.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_MISSAO: Record<MotivoRecusaMissao, string> = {
  missao_desconhecida: 'Missão desconhecida.',
  ja_resgatada: 'Essa recompensa já foi pega.',
  nao_cumprida: 'Essa missão ainda não foi cumprida.',
};

export const MENSAGENS_CANCELAMENTO: Record<MotivoRecusaCancelamento, string> = {
  item_invalido: 'Esse item não está mais na fila. Talvez já tenha terminado.',
};

export const MENSAGENS_VILA: Record<MotivoRecusaVila, string> = {
  povoado_invalido: 'Só dá para melhorar vilas suas.',
  nivel_maximo: 'Esta vila já está no nível máximo.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_RECRUTAMENTO: Record<MotivoRecusaRecrutamento, string> = {
  ja_tem_heroi: 'Você já tem um herói nesta temporada.',
  sem_quartel: 'Construa o Quartel para recrutar um herói.',
  nome_invalido: 'O nome precisa ter de 2 a 20 letras.',
  especialidade_invalida: 'Escolha uma especialidade.',
  sem_populacao: 'Falta um habitante livre para virar herói.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_TREINO_HEROI: Record<MotivoRecusaTreinoHeroi, string> = {
  sem_heroi: 'Você ainda não tem um herói.',
  nivel_maximo: 'Seu herói já está no nível máximo.',
  em_treino: 'Seu herói já está treinando.',
  ferido: 'Seu herói está ferido e precisa se recuperar antes de treinar.',
  fora_da_cidade: 'O herói só treina na cidade. Traga-o de volta com uma marcha de movimento.',
  recursos_insuficientes: 'Recursos insuficientes.',
};
