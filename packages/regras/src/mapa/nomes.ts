// Nomes para territórios e regiões do mapa gerado. Sem apóstrofos (vão para SQL e para o mapa).
export const NOMES_TERRITORIOS = [
  'Vau do Corvo', 'Pedra Alta', 'Vale Sombrio', 'Campo das Cinzas', 'Ponte Velha', 'Monte Escuro',
  'Charneca Fria', 'Bosque dos Enforcados', 'Pico do Falcão', 'Lagoa Turva', 'Colina do Javali', 'Brejo Negro',
  'Rocha Partida', 'Prado dos Reis', 'Vila Queimada', 'Garganta do Lobo', 'Mata Cerrada', 'Planalto Ventoso',
  'Ermida Esquecida', 'Forte Caído', 'Riacho Frio', 'Serra do Urso', 'Várzea Dourada', 'Torre Partida',
  'Desfiladeiro Rubro', 'Clareira Antiga', 'Encosta dos Corvos', 'Campina Alegre', 'Vau das Pedras', 'Penha Bravia',
  'Moinho Velho', 'Fosso dos Ossos', 'Outeiro Verde', 'Baía Cinzenta', 'Pinhal Escuro', 'Cerro das Águias',
  'Ruínas de Ferro', 'Lameiro Fundo', 'Sertão Seco', 'Atalaia do Norte', 'Poço dos Desejos', 'Ribeira Mansa',
  'Bastião Ermo', 'Gruta do Eco', 'Trilha do Peregrino', 'Coroa de Pedra', 'Cabo da Tormenta', 'Vale do Silêncio',
] as const;

export const NOMES_REGIOES = {
  planicie: ['Planícies', 'Campos', 'Pradarias'],
  floresta: ['Florestas', 'Bosques', 'Matas'],
  montanha: ['Montanhas', 'Serras', 'Penhascos'],
} as const;

/** Direção a partir do centro do mapa (y cresce para o sul). */
export const DIRECOES = ['do Leste', 'do Sudeste', 'do Sul', 'do Sudoeste', 'do Oeste', 'do Noroeste', 'do Norte', 'do Nordeste'] as const;
