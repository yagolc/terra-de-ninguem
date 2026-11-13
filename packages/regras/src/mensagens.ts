// Textos para o jogador de cada motivo de recusa. Servidor e interface usam os mesmos.
import type { MotivoRecusaAtaque, MotivoRecusaMovimento } from './ataques.ts';
import type { MotivoRecusaInscricao } from './avisos.ts';
import { BALANCEAMENTO } from './balanceamento.ts';
import type { MotivoRecusaCancelamento } from './cancelamento.ts';
import type { MotivoRecusaArauto, MotivoRecusaCompra, MotivoRecusaPresente, MotivoRecusaTerminarObra } from './loja.ts';
import type { MotivoRecusaDestruicao, MotivoRecusaEstrada, MotivoRecusaEstrutura } from './estruturas.ts';
import type { MotivoRecusaMissao } from './missoes.ts';
import type { MotivoRecusaNome } from './nome.ts';
import type { MotivoRecusaPerfil } from './perfil.ts';
import type { MotivoRecusaCarta, MotivoRecusaRespostaPacto } from './pombos.ts';
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
  sem_acampamento: 'Esse território não tem um acampamento militar seu pronto.',
  quantidade_invalida: 'Quantidade de tropas inválida.',
  fila_cheia: 'A fila do quartel está cheia. Espere um lote terminar.',
  sem_quartel: 'Construa um Quartel primeiro.',
  recursos_insuficientes: 'Recursos insuficientes.',
  populacao_insuficiente: 'Não há habitantes livres suficientes.',
};

export const MENSAGENS_ATAQUE: Record<MotivoRecusaAtaque, string> = {
  origem_invalida: 'As tropas precisam sair de um território seu.',
  nao_vizinho:
    'Só dá para atacar um território vizinho ao de onde as tropas saem ou, com acesso militar, vizinho às terras de quem deu o acesso.',
  alvo_proprio: 'Esse território já é seu.',
  sem_tropas: 'Escolha quantas tropas vão marchar.',
  tropas_insuficientes: 'Você não tem tantas tropas nesse território.',
  cidade_nao_conquistavel: 'Cidades principais podem ser saqueadas, mas nunca conquistadas.',
  protecao_iniciante: 'Nas primeiras 48 horas da temporada ninguém ataca jogadores. Os territórios neutros já podem ser atacados.',
  alvo_com_escudo: 'Esse jogador perdeu uma defesa há pouco e está protegido por um escudo.',
  pacto_nao_agressao: 'Você tem um pacto de não agressão com esse jogador. Espere o pacto acabar para atacá-lo.',
};

export const MENSAGENS_MOVIMENTO: Record<MotivoRecusaMovimento, string> = {
  origem_invalida: 'As tropas precisam sair de um território seu.',
  destino_invalido: 'Só dá para mover tropas para um território seu. Para tomar outro, use Atacar.',
  mesmo_territorio: 'Escolha outro território como destino.',
  sem_caminho:
    'O destino não está ligado à origem por territórios seus (ou de quem te deu acesso militar): as tropas teriam de atravessar terra alheia.',
  sem_tropas: 'Escolha quantas tropas vão se mover.',
  tropas_insuficientes: 'Você não tem tantas tropas nesse território.',
};

export const MENSAGENS_RECONHECIMENTO: Record<MotivoRecusaReconhecimento, string> = {
  origem_invalida: 'O batedor precisa sair de um território seu.',
  nao_vizinho: 'O batedor só alcança territórios vizinhos aos seus ou, com acesso militar, vizinhos às terras de quem deu o acesso.',
  alvo_proprio: 'Esse território já é seu: você já sabe o que tem lá.',
  ouro_insuficiente: 'Falta ouro para pagar o batedor.',
};

export const MENSAGENS_ESTRUTURA: Record<MotivoRecusaEstrutura, string> = {
  territorio_invalido: 'Só dá para construir em territórios seus.',
  ja_tem_estrutura: 'Esse território já tem uma estrutura. É uma por território: destrua a atual para construir outra.',
  recursos_insuficientes: 'Recursos insuficientes.',
  acampamento_na_cidade: 'O acampamento militar vai num território conquistado, não na cidade (ela já tem o Quartel).',
  limite_acampamentos: 'Você já tem um acampamento militar. Destrua o atual para fazer outro.',
};

export const MENSAGENS_DESTRUICAO: Record<MotivoRecusaDestruicao, string> = {
  territorio_invalido: 'Só dá para destruir estruturas nos seus territórios.',
  sem_estrutura: 'Esse território não tem uma estrutura sua.',
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

export const MENSAGENS_TERMINAR_OBRA: Record<MotivoRecusaTerminarObra, string> = {
  sem_obra: 'Nenhuma obra sendo feita agora.',
  item_invalido: 'Só dá para terminar a obra que está sendo feita agora. Talvez ela já tenha terminado.',
  predio_proibido: 'A Muralha não pode ser terminada com gemas.',
  nivel_alto: `Só obras até o nível ${BALANCEAMENTO.loja.terminarObra.nivelMaximo} podem ser terminadas com gemas.`,
  gemas_insuficientes: 'Gemas insuficientes. Compre mais na loja (💎 no alto da tela).',
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
  em_marcha: 'O herói está em marcha. Ele treina quando chegar a um território.',
  recursos_insuficientes: 'Recursos insuficientes.',
};

export const MENSAGENS_CARTA: Record<MotivoRecusaCarta, string> = {
  sem_pombal: 'Construa um Pombal para mandar cartas.',
  sem_pombos: 'Todos os seus pombos estão voando. Espere um chegar ou evolua o Pombal.',
  destinatario_invalido: 'Escolha outro jogador desta temporada.',
  carta_vazia: 'Escreva a carta ou faça uma proposta.',
  texto_longo: 'A carta pode ter no máximo 500 letras.',
  proposta_invalida: 'Proposta desconhecida.',
  horas_invalidas: 'O pacto dura de 1 a 12 horas.',
};

export const MENSAGENS_INSCRICAO_AVISOS: Record<MotivoRecusaInscricao, string> = {
  inscricao_invalida: 'O navegador não mandou uma inscrição de avisos válida. Recarregue o jogo e tente de novo.',
  sem_tipos: 'Escolha pelo menos um tipo de aviso.',
};

export const MENSAGENS_RESPOSTA_PACTO: Record<MotivoRecusaRespostaPacto, string> = {
  sem_proposta: 'Essa carta não traz proposta para você.',
  ainda_voando: 'A carta ainda não chegou.',
  ja_respondida: 'Essa proposta já foi respondida.',
  proposta_expirada: 'A proposta expirou. Peça outra a quem mandou.',
  objetivo_em_jogo:
    'Um de vocês está segurando o objetivo cumprido: enquanto o relógio corre, não vale pacto de não agressão. Acesso militar continua valendo.',
};

export const MENSAGENS_NOME: Record<MotivoRecusaNome, string> = {
  nome_vazio: 'Escreva um nome.',
  nome_longo: 'O nome pode ter no máximo 24 caracteres.',
  nome_em_uso: 'Outro jogador já usa esse nome.',
};

export const MENSAGENS_PERFIL: Record<MotivoRecusaPerfil, string> = {
  cor_invalida: 'Escolha uma cor da paleta.',
  cor_em_uso: 'Outro jogador desta temporada já usa essa cor.',
  cor_secundaria_invalida: 'Escolha a segunda cor da paleta.',
  padrao_invalido: 'Padrão de bandeira desconhecido.',
  emblema_invalido: 'O emblema tem uma camada inválida.',
  camadas_demais: 'O emblema pode ter no máximo 20 camadas.',
  descricao_longa: 'A descrição pode ter no máximo 280 caracteres.',
  item_nao_comprado: 'Esse padrão ou forma é do pacote de bandeiras exclusivas da loja (💎).',
};

export const MENSAGENS_COMPRA: Record<MotivoRecusaCompra, string> = {
  item_invalido: 'Item desconhecido na loja.',
  ja_comprado: 'Você já tem esse item.',
  sem_temporada: 'Esse item vale para a temporada, e nenhuma está em andamento.',
  gemas_insuficientes: 'Gemas insuficientes. Compre mais na loja.',
};

export const MENSAGENS_ARAUTO: Record<MotivoRecusaArauto, string> = {
  texto_vazio: 'Escreva o que o arauto vai anunciar.',
  texto_longo: `O arauto anuncia no máximo ${BALANCEAMENTO.loja.arauto.tamanhoMaximo} letras.`,
  arauto_no_ar: 'Seu arauto ainda está anunciando. Espere ele terminar para mandar outro.',
  gemas_insuficientes: 'Gemas insuficientes. Compre mais na loja.',
};

export const MENSAGENS_PRESENTE: Record<MotivoRecusaPresente, string> = {
  quantidade_invalida: `Presenteie de 1 a ${BALANCEAMENTO.loja.presenteMaximo} gemas.`,
  para_si_mesmo: 'Não dá para presentear a si mesmo.',
  gemas_insuficientes: 'Você não tem todas essas gemas.',
};

export const MENSAGENS_TITULO: Record<'titulo_nao_comprado', string> = {
  titulo_nao_comprado: 'Esse título ainda não é seu: compre na loja (💎).',
};
