import PainelLoja from '../componentes/PainelLoja';

/** Aba Loja (`#loja`, botão 💎 do cabeçalho): saldo de gemas, pacotes por Pix e pedidos. */
export default function Loja() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-4">
      <PainelLoja />
    </div>
  );
}
