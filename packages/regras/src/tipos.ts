export const RECURSOS = ['comida', 'madeira', 'ouro'] as const;
export type Recurso = (typeof RECURSOS)[number];
export type Recursos = Record<Recurso, number>;

export const TIPOS_UNIDADE = ['lanceiro', 'arqueiro', 'cavalaria'] as const;
export type TipoUnidade = (typeof TIPOS_UNIDADE)[number];
/** Quantidade de unidades por tipo. */
export type Exercito = Record<TipoUnidade, number>;

export const TIPOS_PREDIO = ['centro', 'casa', 'fazenda', 'serraria', 'mercado', 'armazem', 'quartel', 'muralha'] as const;
export type TipoPredio = (typeof TIPOS_PREDIO)[number];
/** Nível de cada prédio da cidade; 0 = ainda não construído. */
export type NiveisPredios = Record<TipoPredio, number>;

export const TERRENOS = ['planicie', 'floresta', 'montanha'] as const;
export type Terreno = (typeof TERRENOS)[number];

export type Ponto = { x: number; y: number };

/** Estado econômico de uma cidade, como fica gravado no banco. */
export type EstadoCidade = {
  recursos: Recursos;
  /** Habitantes totais (trabalhadores + soldados + livres). Pode ser fracionário: cresce aos poucos. */
  populacao: number;
  /** Trabalhadores alocados em cada recurso (fazenda, serraria, mercado). */
  trabalhadores: Recursos;
  predios: NiveisPredios;
  /** Instante (ms desde a época) até onde a produção já foi calculada. */
  atualizadoEm: number;
};

/** Obra na fila: o prédio `tipo` sobe um nível em `prontoEm` (ms). As obras são feitas uma depois da outra. */
export type Obra = { tipo: TipoPredio; prontoEm: number };

/** Lote de tropas em treino: entra no exército em `prontoEm` (ms). */
export type LoteTreino = { tipo: TipoUnidade; quantidade: number; prontoEm: number };

/** Resultado de uma validação: ok com dados extras, ou o motivo da recusa. */
export type Verificacao<Dados, Motivo extends string> = ({ ok: true } & Dados) | { ok: false; motivo: Motivo };
