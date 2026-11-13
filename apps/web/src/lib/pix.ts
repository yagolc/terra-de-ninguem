import { pixCopiaECola } from '@terra/regras';
import QRCode from 'qrcode';

/**
 * Conta que recebe o Pix da loja. Fica nas variáveis do site (`.env.local` e painel da Vercel), não no git.
 * Sem as três, a loja mostra que ainda não está aberta.
 */
const chave = (import.meta.env.VITE_PIX_CHAVE as string | undefined)?.trim();
const nome = (import.meta.env.VITE_PIX_NOME as string | undefined)?.trim();
const cidade = (import.meta.env.VITE_PIX_CIDADE as string | undefined)?.trim();

export const pixConfigurado = !!(chave && nome && cidade);

/** Pix copia e cola do pedido: valor e código já preenchidos. */
export function pixDoPedido(valorCentavos: number, codigo: string): string | null {
  if (!chave || !nome || !cidade) return null;
  return pixCopiaECola({ chave, nome, cidade, valor: valorCentavos / 100, identificador: codigo });
}

/** QR Code do Pix como imagem (data URL). */
export function qrCodeDoPix(texto: string): Promise<string> {
  return QRCode.toDataURL(texto, { margin: 1, width: 240, errorCorrectionLevel: 'M' });
}

export function formatarReais(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
