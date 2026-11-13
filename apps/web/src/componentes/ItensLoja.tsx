import { BALANCEAMENTO, CORES_LOJA, TIPOS_TITULO, TITULOS_LOJA, itemComprado, type ItemLoja, type TituloLoja } from '@terra/regras';
import { useState } from 'react';
import type { Gemas } from '../lib/useGemas';
import JanelaConfirmacao from './JanelaConfirmacao';

type Props = {
  gemas: Gemas;
  ocupado: boolean;
  onComprar: (item: ItemLoja, variante?: TituloLoja, pedido?: string) => void;
  onUsarTitulo: (titulo: TituloLoja | null) => void;
};

type Compra = { item: ItemLoja; variante?: TituloLoja; nome: string; pedido?: string };

const INFO: Record<Exclude<ItemLoja, 'titulo'>, { nome: string; icone: string; descricao: string }> = {
  bandeiras_exclusivas: {
    nome: 'Bandeiras exclusivas',
    icone: '🚩',
    descricao: '5 padrões (Divisa, Pala, Aspa, Ponta, Listrada) e 4 formas de emblema (Estrela de 8, Cruz de Malta, Trevo, Diamante). Para sempre.',
  },
  cor_ouro: { nome: 'Cor ouro real', icone: '', descricao: 'Pinta seus territórios e sua bandeira de ouro. Para sempre.' },
  cor_prata: { nome: 'Cor prata', icone: '', descricao: 'Pinta seus territórios e sua bandeira de prata. Para sempre.' },
  destaque_cidade: {
    nome: 'Destaque da cidade',
    icone: '✨',
    descricao: 'Sua cidade aparece maior no mapa, com um brilho dourado, até o fim desta temporada.',
  },
  cronica: {
    nome: 'Seu nome na Crônica',
    icone: '📜',
    descricao: 'Você vira personagem do capítulo desta temporada na Crônica do reino. Conte como quer ser lembrado.',
  },
};

/** Itens da loja: visuais permanentes, destaque da temporada e títulos (comprar e escolher o que aparece). */
export default function ItensLoja({ gemas, ocupado, onComprar, onUsarTitulo }: Props) {
  const [compra, setCompra] = useState<Compra | null>(null);
  const preco = (item: ItemLoja) => BALANCEAMENTO.loja.itens[item].preco;
  const tem = (item: ItemLoja, variante: TituloLoja | null = null) => itemComprado(gemas.itens, item, variante, gemas.temporadaId);

  return (
    <div className="space-y-3">
      <h4 className="font-titulo text-ouro">Itens</h4>
      <ul className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(INFO) as (keyof typeof INFO)[]).map((item) => {
          const info = INFO[item];
          const comprado = tem(item);
          const semTemporada = BALANCEAMENTO.loja.itens[item].escopo === 'temporada' && !gemas.temporadaId;
          return (
            <li key={item} className="flex flex-col gap-2 rounded-lg border border-couro bg-noite/50 p-3 text-sm">
              <p className="flex items-center gap-2 font-semibold text-pergaminho">
                {item === 'cor_ouro' || item === 'cor_prata' ? (
                  <span className="inline-block size-4 rounded-full border border-pergaminho/40" style={{ background: CORES_LOJA[item] }} aria-hidden />
                ) : (
                  <span aria-hidden>{info.icone}</span>
                )}
                {info.nome}
              </p>
              <p className="flex-1 text-xs text-pergaminho-escuro">{info.descricao}</p>
              {comprado ? (
                <p className="text-xs text-musgo">
                  ✅ {item === 'destaque_cidade' ? 'Ativo nesta temporada' : item === 'cronica' ? 'Você está no capítulo desta temporada' : 'Seu'}
                </p>
              ) : (
                <button
                  disabled={ocupado || semTemporada}
                  onClick={() => setCompra({ item, nome: info.nome })}
                  className="rounded-lg border border-ouro/60 px-3 py-1.5 text-xs font-semibold text-ouro hover:bg-ouro/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {semTemporada ? 'Sem temporada em andamento' : `Comprar · ${preco(item)} 💎`}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <h4 className="font-titulo text-ouro">Títulos</h4>
        <p className="text-xs text-pergaminho-escuro">
          Aparecem embaixo do seu nome no placar e no perfil. {preco('titulo')} 💎 cada, para sempre; você escolhe qual mostrar.
        </p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {TIPOS_TITULO.map((titulo) => {
            const meu = tem('titulo', titulo);
            const emUso = gemas.titulo === titulo;
            return (
              <li key={titulo} className="flex items-center gap-2 rounded-lg border border-couro bg-noite/50 px-3 py-1.5 text-sm">
                <span className={`flex-1 ${emUso ? 'text-ouro-claro' : ''}`}>
                  {emUso && '👑 '}
                  {TITULOS_LOJA[titulo]}
                </span>
                {!meu ? (
                  <button
                    disabled={ocupado}
                    onClick={() => setCompra({ item: 'titulo', variante: titulo, nome: `Título "${TITULOS_LOJA[titulo]}"` })}
                    className="rounded-md border border-ouro/60 px-2 py-0.5 text-xs text-ouro hover:bg-ouro/10 disabled:opacity-40"
                  >
                    {preco('titulo')} 💎
                  </button>
                ) : emUso ? (
                  <button
                    disabled={ocupado}
                    onClick={() => onUsarTitulo(null)}
                    className="rounded-md px-2 py-0.5 text-xs text-pergaminho-escuro hover:text-pergaminho disabled:opacity-40"
                  >
                    Tirar
                  </button>
                ) : (
                  <button
                    disabled={ocupado}
                    onClick={() => onUsarTitulo(titulo)}
                    className="rounded-md border border-couro px-2 py-0.5 text-xs text-pergaminho hover:border-ouro/60 disabled:opacity-40"
                  >
                    Usar
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {compra && (
        <JanelaConfirmacao
          titulo="Comprar?"
          confirmar={gemas.saldo >= preco(compra.item) ? `Comprar por ${preco(compra.item)} 💎` : 'Entendi'}
          onConfirmar={() => {
            if (gemas.saldo >= preco(compra.item)) onComprar(compra.item, compra.variante, compra.pedido);
          }}
          onFechar={() => setCompra(null)}
        >
          <p>
            <b>{compra.nome}</b> por <b>{preco(compra.item)} gemas</b> (você tem {gemas.saldo}).
          </p>
          {compra.item === 'cronica' && (
            <label className="block space-y-1">
              <span className="text-sm">Como quer ser lembrado? (opcional)</span>
              <textarea
                value={compra.pedido ?? ''}
                onChange={(e) => setCompra({ ...compra, pedido: e.target.value })}
                rows={3}
                maxLength={BALANCEAMENTO.loja.pedidoCronicaMaximo}
                placeholder="O lobo do norte que nunca recuou e traiu o próprio irmão por uma vila."
                className="w-full rounded-lg border border-couro bg-noite px-3 py-2 text-sm text-pergaminho focus:border-ouro focus:outline-none"
              />
              <span className="block text-right text-xs text-pergaminho-escuro">
                O capítulo sai quando a temporada acabar.
              </span>
            </label>
          )}
          {gemas.saldo < preco(compra.item) && <p className="text-red-300">Gemas insuficientes: compre um pacote acima.</p>}
        </JanelaConfirmacao>
      )}
    </div>
  );
}
