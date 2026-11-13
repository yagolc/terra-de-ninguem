import { useEffect, useState } from 'react';
import { formatarReais, pixDoPedido, qrCodeDoPix } from '../lib/pix';
import type { PedidoGemas } from '../lib/useGemas';

/** QR Code e Pix copia e cola de um pedido de gemas, com o valor e o código já preenchidos. */
export default function PixDoPedido({ pedido }: { pedido: PedidoGemas }) {
  const texto = pixDoPedido(pedido.valorCentavos, pedido.codigo);
  const [qr, setQr] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (!texto) return;
    let vivo = true;
    void qrCodeDoPix(texto).then((url) => vivo && setQr(url));
    return () => {
      vivo = false;
    };
  }, [texto]);

  if (!texto) return null;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto!);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-ouro/40 bg-noite/60 p-3 text-sm">
      <p>
        Pague <b className="text-ouro-claro">{formatarReais(pedido.valorCentavos)}</b> por {pedido.gemas} gemas. Código do pedido:{' '}
        <b className="font-mono text-ouro-claro">{pedido.codigo}</b>
      </p>
      {qr && <img src={qr} alt={`QR Code do Pix de ${formatarReais(pedido.valorCentavos)}`} width={200} height={200} className="mx-auto rounded bg-white p-1" />}
      <div className="space-y-1">
        <p className="text-xs text-pergaminho-escuro">Ou copie e cole no app do banco (Pix → Copia e Cola):</p>
        <div className="flex gap-2">
          <input readOnly value={texto} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 rounded-md border border-couro bg-noite px-2 py-1 font-mono text-xs" />
          <button onClick={() => void copiar()} className="shrink-0 rounded-md border border-ouro/60 px-3 py-1 text-xs font-semibold text-ouro hover:bg-ouro/10">
            {copiado ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-pergaminho-escuro">
        As gemas entram quando o organizador conferir o Pix (não é automático). Não mude o valor: é por ele e pelo código que o
        pedido é achado.
      </p>
    </div>
  );
}
