// Pix "copia e cola" (BR Code estático do Banco Central): o texto que o app do banco lê para pagar a
// chave Pix com valor e identificador já preenchidos. Função pura; o site gera o QR Code a partir dele.

/** CRC16-CCITT (polinômio 0x1021, começo 0xFFFF), em 4 dígitos hexadecimais maiúsculos. */
export function crc16Pix(texto: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(texto)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Sem acentos e só com caracteres que todo banco aceita no nome e na cidade. */
function limpar(texto: string, maximo: number): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .slice(0, maximo);
}

function campo(id: string, valor: string): string {
  return `${id}${String(valor.length).padStart(2, '0')}${valor}`;
}

/**
 * Monta o Pix copia e cola. `valor` em reais (até 2 casas); `identificador` (txid) com até 25 letras e números,
 * aparece no extrato de quem recebe e serve para achar o pedido.
 */
export function pixCopiaECola(entrada: { chave: string; nome: string; cidade: string; valor?: number; identificador?: string }): string {
  const { chave, nome, cidade, valor, identificador } = entrada;
  const conta = campo('00', 'br.gov.bcb.pix') + campo('01', chave.trim());
  const txid = (identificador ?? '').replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const semCrc =
    campo('00', '01') +
    campo('26', conta) +
    campo('52', '0000') +
    campo('53', '986') +
    (valor !== undefined && valor > 0 ? campo('54', valor.toFixed(2)) : '') +
    campo('58', 'BR') +
    campo('59', limpar(nome, 25)) +
    campo('60', limpar(cidade, 15)) +
    campo('62', campo('05', txid)) +
    '6304';
  return semCrc + crc16Pix(semCrc);
}
