import type { Recurso, TipoPredio } from '@terra/regras';

export const PREDIOS: Record<TipoPredio, { nome: string; icone: string; descricao: string }> = {
  centro: { nome: 'Centro da Cidade', icone: '🏛️', descricao: 'Define o nível máximo de todos os outros prédios.' },
  casa: { nome: 'Casa', icone: '🏠', descricao: 'Aumenta o limite de população e o crescimento.' },
  fazenda: { nome: 'Fazenda', icone: '🌾', descricao: 'Trabalhadores produzem comida.' },
  serraria: { nome: 'Serraria', icone: '🪚', descricao: 'Trabalhadores produzem madeira.' },
  mercado: { nome: 'Mercado', icone: '⚖️', descricao: 'Trabalhadores produzem ouro.' },
  armazem: { nome: 'Armazém', icone: '📦', descricao: 'Guarda mais recursos e protege uma parte contra saques.' },
  quartel: { nome: 'Quartel', icone: '⚔️', descricao: 'Treina lanceiros, arqueiros e cavalaria.' },
  muralha: { nome: 'Muralha', icone: '🧱', descricao: 'Bônus de defesa para a cidade.' },
};

export const RECURSOS_INFO: Record<Recurso, { nome: string; icone: string }> = {
  comida: { nome: 'Comida', icone: '🌾' },
  madeira: { nome: 'Madeira', icone: '🪵' },
  ouro: { nome: 'Ouro', icone: '🪙' },
};

const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

/** Arredonda para baixo: o jogador só pode gastar o que já foi produzido por inteiro. */
export function formatarNumero(valor: number): string {
  return numero.format(Math.floor(valor));
}

export function formatarTaxa(valorPorHora: number): string {
  return decimal.format(valorPorHora);
}

export function formatarDuracao(ms: number): string {
  const totalSeg = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSeg / 3600);
  const min = Math.floor((totalSeg % 3600) / 60);
  const seg = totalSeg % 60;
  if (h > 0) return `${h} h ${String(min).padStart(2, '0')} min`;
  if (min > 0) return `${min} min${seg > 0 ? ` ${seg} s` : ''}`;
  return `${seg} s`;
}
