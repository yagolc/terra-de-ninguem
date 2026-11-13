import { BALANCEAMENTO, gastoTerminarObra, precoPacoteReais, precoTerminarObra } from '@terra/regras';
import { useState } from 'react';
import { formatarReais, pixConfigurado } from '../lib/pix';
import { useGemas } from '../lib/useGemas';
import PixDoPedido from './PixDoPedido';

const STATUS: Record<string, string> = { pendente: '⏳ esperando o Pix ser conferido', pago: '✅ creditado' };

/**
 * Loja de gemas (aba Loja, botão 💎 do cabeçalho): saldo, pacotes para comprar por Pix e os pedidos. As gemas servem para terminar
 * na hora a obra que está sendo feita (até o nível 7, nunca a Muralha), com o preço dobrando a cada uso na temporada.
 */
export default function PainelLoja() {
  const { gemas, pedir, cancelarPedido } = useGemas();
  const [aberto, setAberto] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const { precoBase, nivelMaximo } = BALANCEAMENTO.loja.terminarObra;

  async function fazer(acao: () => Promise<void>) {
    setOcupado(true);
    setMensagem(null);
    try {
      await acao();
    } catch (e) {
      setMensagem({ texto: e instanceof Error ? e.message : 'Não deu certo. Tente de novo.', erro: true });
    } finally {
      setOcupado(false);
    }
  }

  if (!gemas) return null;
  const pendentes = gemas.pedidos.filter((p) => p.status === 'pendente');

  return (
    <section className="space-y-3 rounded-2xl border border-couro bg-carvao/90 p-4">
      <div>
        <h3 className="font-titulo text-lg text-ouro">💎 Loja de gemas</h3>
        <p className="text-sm text-pergaminho-escuro">
          Com gemas você termina na hora a obra que está sendo feita na cidade (até o nível {nivelMaximo}, nunca a Muralha). O primeiro uso
          da temporada custa {precoBase} gemas e o preço dobra a cada uso ({[0, 1, 2, 3].map(precoTerminarObra).join(', ')}…); na
          temporada nova volta para {precoBase}. Todos veem no placar quantas vezes cada um usou (⚡).
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-noite/60 px-3 py-2">
          <p className="font-titulo text-xl text-ouro-claro tabular-nums">💎 {gemas.saldo}</p>
          <p className="text-xs text-pergaminho-escuro">suas gemas</p>
        </div>
        <div className="rounded-lg bg-noite/60 px-3 py-2">
          <p className="font-titulo text-xl text-ouro-claro tabular-nums">⚡ {gemas.usos}</p>
          <p className="text-xs text-pergaminho-escuro">
            usos nesta temporada · próximo: {precoTerminarObra(gemas.usos)} 💎 (já gastou {gastoTerminarObra(gemas.usos)})
          </p>
        </div>
      </div>

      {!pixConfigurado ? (
        <p className="text-sm text-pergaminho-escuro">A loja ainda não está aberta: falta configurar o Pix.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm">Comprar gemas por Pix:</p>
          <div className="flex flex-wrap gap-2">
            {BALANCEAMENTO.loja.pacotes.map((quantidade) => (
              <button
                key={quantidade}
                disabled={ocupado || pendentes.length >= BALANCEAMENTO.loja.pedidosPendentesMaximo}
                onClick={() =>
                  void fazer(async () => {
                    const r = await pedir(quantidade);
                    setAberto(r.codigo);
                  })
                }
                className="rounded-lg border border-ouro/60 px-3 py-2 text-sm font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {quantidade} 💎 · {formatarReais(precoPacoteReais(quantidade) * 100)}
              </button>
            ))}
          </div>
          {pendentes.length >= BALANCEAMENTO.loja.pedidosPendentesMaximo && (
            <p className="text-xs text-pergaminho-escuro">
              Você já tem {pendentes.length} pedidos esperando. Pague ou cancele um para pedir outro.
            </p>
          )}
        </div>
      )}

      {mensagem && <p className={`text-sm ${mensagem.erro ? 'text-red-300' : 'text-musgo'}`}>{mensagem.texto}</p>}

      {gemas.pedidos.length > 0 && (
        <ul className="space-y-2">
          {gemas.pedidos.map((p) => (
            <li key={p.codigo} className="space-y-2 border-t border-couro/60 pt-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex-1">
                  {p.gemas} 💎 · {formatarReais(p.valorCentavos)} · <span className="font-mono text-xs">{p.codigo}</span>
                  <span className="block text-xs text-pergaminho-escuro">
                    {STATUS[p.status]} · {new Date(p.pagoEm ?? p.criadoEm).toLocaleDateString('pt-BR')}
                  </span>
                </span>
                {p.status === 'pendente' && (
                  <>
                    <button
                      onClick={() => setAberto(aberto === p.codigo ? null : p.codigo)}
                      className="rounded-md border border-ouro/60 px-2 py-1 text-xs text-ouro hover:bg-ouro/10"
                    >
                      {aberto === p.codigo ? 'Esconder Pix' : 'Ver Pix'}
                    </button>
                    <button
                      disabled={ocupado}
                      onClick={() => void fazer(() => cancelarPedido(p.codigo))}
                      className="rounded-md px-2 py-1 text-xs text-pergaminho-escuro hover:bg-sangue/40 hover:text-pergaminho disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
              {p.status === 'pendente' && aberto === p.codigo && <PixDoPedido pedido={p} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
