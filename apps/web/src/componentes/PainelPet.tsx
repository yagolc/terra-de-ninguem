import { BALANCEAMENTO, type TipoPet } from '@terra/regras';
import { useState } from 'react';
import { PETS_INFO, usePets } from '../lib/pets';
import { useGemas } from '../lib/useGemas';
import JanelaConfirmacao from './JanelaConfirmacao';

type Props = { jogadorId: string; ouro: number };

/**
 * Pet da cidade (tela Cidade): escolher qual mora na cidade, ver se foi sequestrado (e pagar o resgate em ouro) e
 * cuidar dos pets que você sequestrou (pedir resgate ou devolver de graça).
 */
export default function PainelPet({ jogadorId, ouro }: Props) {
  const { gemas } = useGemas();
  const { pets, nomeDe, escolher, pedirResgate, libertar, pagarResgate, recarregar } = usePets();
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean } | null>(null);
  const [pagando, setPagando] = useState(false);
  const [precos, setPrecos] = useState<Record<string, number>>({});

  if (!pets || !gemas) return null;
  const comprados = gemas.desbloqueios.pets;
  const meu = pets.find((p) => p.donoId === jogadorId) ?? null;
  const refens = pets.filter((p) => p.mantidoPor === jogadorId && p.donoId !== jogadorId);
  if (comprados.length === 0 && refens.length === 0) return null;

  async function fazer(acao: () => Promise<void>, sucesso: string) {
    setOcupado(true);
    setMensagem(null);
    try {
      await acao();
      setMensagem({ texto: sucesso, erro: false });
    } catch (e) {
      setMensagem({ texto: e instanceof Error ? e.message : 'Não deu certo. Tente de novo.', erro: true });
    } finally {
      setOcupado(false);
    }
  }

  const refem = meu && meu.mantidoPor !== jogadorId;
  const info = (tipo: TipoPet) => `${PETS_INFO[tipo].icone} ${PETS_INFO[tipo].nome}`;

  return (
    <section className="space-y-3 rounded-xl border border-couro bg-carvao/90 p-4">
      <h3 className="font-titulo text-ouro">🐾 Pet da cidade</h3>

      {refem ? (
        <div className="space-y-2 rounded-lg border border-sangue/70 bg-sangue/15 p-3 text-sm">
          <p>
            Seu <b>{info(meu.tipo)}</b> foi sequestrado por <b>{nomeDe(meu.mantidoPor)}</b>!
          </p>
          {meu.resgateOuro ? (
            <>
              <p>
                Pede <b>{meu.resgateOuro} de ouro</b> de resgate (você tem {Math.floor(ouro)}).
              </p>
              <button
                disabled={ocupado}
                onClick={() => setPagando(true)}
                className="rounded-lg border border-ouro/60 px-3 py-1.5 text-xs font-semibold text-ouro hover:bg-ouro/10 disabled:opacity-40"
              >
                Pagar resgate
              </button>
            </>
          ) : (
            <p className="text-pergaminho-escuro">Ainda não pediu resgate. Mande uma carta para negociar.</p>
          )}
          <p className="text-xs text-pergaminho-escuro">
            Ou vá buscar na marra: saqueie a cidade de {nomeDe(meu.mantidoPor)} e vença. Na temporada nova ele volta sozinho.
          </p>
        </div>
      ) : (
        <div className="space-y-2 text-sm">
          <p className="text-pergaminho-escuro">
            {meu ? (
              <>
                <b className="text-pergaminho">{info(meu.tipo)}</b> mora na sua cidade. Cuidado: um saque vencedor contra ela leva o pet como refém.
              </>
            ) : (
              'Escolha um pet para morar na sua cidade (aparece no mapa).'
            )}
          </p>
          {comprados.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {comprados.map((tipo) => (
                <button
                  key={tipo}
                  disabled={ocupado || meu?.tipo === tipo}
                  onClick={() => void fazer(() => escolher(tipo), `${info(tipo)} agora mora na sua cidade.`)}
                  aria-pressed={meu?.tipo === tipo}
                  className={`rounded-lg border px-2.5 py-1 text-sm ${meu?.tipo === tipo ? 'border-ouro bg-ouro/10 text-ouro' : 'border-couro hover:border-ouro/60'} disabled:cursor-default`}
                >
                  {info(tipo)}
                </button>
              ))}
              {meu && (
                <button
                  disabled={ocupado}
                  onClick={() => void fazer(() => escolher(null), 'Nenhum pet na cidade agora.')}
                  className="rounded-lg px-2.5 py-1 text-xs text-pergaminho-escuro hover:text-pergaminho"
                >
                  Nenhum
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {refens.length > 0 && (
        <div className="space-y-2 border-t border-couro/60 pt-2">
          <p className="text-sm font-semibold text-pergaminho">🔒 Seus reféns</p>
          {refens.map((p) => (
            <div key={p.donoId} className="space-y-1.5 rounded-lg bg-noite/50 p-2 text-sm">
              <p>
                {info(p.tipo)} de <b>{nomeDe(p.donoId)}</b>
                {p.resgateOuro ? ` · resgate pedido: ${p.resgateOuro} de ouro` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={BALANCEAMENTO.pets.resgateMaximo}
                  value={precos[p.donoId] ?? p.resgateOuro ?? 200}
                  onChange={(e) => setPrecos({ ...precos, [p.donoId]: Math.floor(Number(e.target.value)) })}
                  aria-label="Resgate em ouro"
                  className="w-24 rounded-lg border border-couro bg-noite px-2 py-1 text-pergaminho focus:border-ouro focus:outline-none"
                />
                <button
                  disabled={ocupado}
                  onClick={() => {
                    const ouroPedido = precos[p.donoId] ?? p.resgateOuro ?? 200;
                    void fazer(() => pedirResgate(p.donoId, ouroPedido), `Resgate de ${ouroPedido} de ouro pedido a ${nomeDe(p.donoId)}.`);
                  }}
                  className="rounded-lg border border-ouro/60 px-2.5 py-1 text-xs font-semibold text-ouro hover:bg-ouro/10 disabled:opacity-40"
                >
                  {p.resgateOuro ? 'Mudar resgate' : 'Pedir resgate'}
                </button>
                <button
                  disabled={ocupado}
                  onClick={() => void fazer(() => libertar(p.donoId), `${info(p.tipo)} devolvido a ${nomeDe(p.donoId)}.`)}
                  className="rounded-lg px-2.5 py-1 text-xs text-pergaminho-escuro hover:text-pergaminho disabled:opacity-40"
                >
                  Devolver de graça
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mensagem && <p className={`text-sm ${mensagem.erro ? 'text-red-300' : 'text-musgo'}`}>{mensagem.texto}</p>}

      {pagando && meu?.resgateOuro && (
        <JanelaConfirmacao
          titulo="Pagar o resgate?"
          confirmar={ouro >= meu.resgateOuro ? `Pagar ${meu.resgateOuro} de ouro` : 'Entendi'}
          onConfirmar={() => {
            if (ouro >= meu.resgateOuro!) {
              const preco = meu.resgateOuro!;
              // Se o preço mudou no meio do caminho, o servidor recusa: relê para mostrar o valor novo.
              void fazer(
                () =>
                  pagarResgate(preco).catch(async (e: unknown) => {
                    await recarregar();
                    throw e;
                  }),
                `${info(meu.tipo)} voltou para casa!`,
              );
            }
          }}
          onFechar={() => setPagando(false)}
        >
          <p>
            {meu.resgateOuro} de ouro saem da sua cidade e vão para {nomeDe(meu.mantidoPor)}, e seu {PETS_INFO[meu.tipo].nome.toLowerCase()} volta na hora.
          </p>
          {ouro < meu.resgateOuro && <p className="text-red-300">Você não tem todo esse ouro.</p>}
        </JanelaConfirmacao>
      )}
    </section>
  );
}
