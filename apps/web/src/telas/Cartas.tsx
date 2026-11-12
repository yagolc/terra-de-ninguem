import type { Session } from '@supabase/supabase-js';
import { pactoEntre, pombosDoPombal } from '@terra/regras';
import { useEffect, useState } from 'react';
import FormularioCarta from '../componentes/FormularioCarta';
import ItemCarta from '../componentes/ItemCarta';
import { chamarFuncao } from '../lib/funcoes';
import { PREDIOS, formatarDuracao } from '../lib/textos';
import { useCartas } from '../lib/useCartas';

type Props = {
  sessao: Session;
  /** Jogador para quem já abrir uma carta (`#cartas=<id>`, vindo do perfil). */
  para: string | null;
};

/** Tela Cartas: pombos-correio entre jogadores e propostas de pacto de não agressão. */
export default function Cartas({ sessao, para }: Props) {
  const meuId = sessao.user.id;
  const { estado, erro, recarregar } = useCartas(meuId);
  const [agora, setAgora] = useState(() => Date.now());
  // null = formulário fechado; '' = aberto sem destinatário.
  const [escrevendoPara, setEscrevendoPara] = useState<string | null>(para);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (para) setEscrevendoPara(para);
  }, [para]);

  if (erro) return <p className="p-6 text-center text-pergaminho-escuro">{erro}</p>;
  if (estado === undefined) return <p className="p-6 text-center text-pergaminho-escuro">Buscando as cartas…</p>;
  if (estado === null) return <p className="p-6 text-center text-pergaminho-escuro">Nenhuma temporada em andamento.</p>;

  const { cartas, correspondentes, nomes, minhaCidade, nivelPombal } = estado;
  const emVoo = cartas.filter((c) => c.remetenteId === meuId && c.chegaEm > agora).length;
  const pactos = cartas.flatMap((c) =>
    c.pactoAte !== null ? [{ jogadores: [c.remetenteId, c.destinatarioId] as const, ate: c.pactoAte }] : [],
  );
  const pactosAtivos = correspondentes.flatMap((j) => {
    const ate = pactoEntre(pactos, meuId, j.id, agora);
    return ate === null ? [] : [{ nome: j.nome, ate }];
  });
  // O RLS já esconde as recebidas que ainda voam; as mandadas aparecem desde a saída do pombo.
  const visiveis = cartas.filter((c) => c.remetenteId === meuId || c.chegaEm <= agora);

  async function responderPacto(cartaId: string, aceitar: boolean) {
    setOcupado(true);
    setAviso(null);
    try {
      await chamarFuncao('cidade', { acao: 'responder_pacto', carta_id: cartaId, aceitar });
      await recarregar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'Não foi possível responder.');
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-titulo text-lg text-ouro">Cartas</h2>
          <p className="text-xs text-pergaminho-escuro">
            {nivelPombal > 0
              ? `${PREDIOS.pombal.icone} Pombal nível ${nivelPombal} · pombos livres: ${Math.max(0, pombosDoPombal(nivelPombal) - emVoo)} de ${pombosDoPombal(nivelPombal)}`
              : `Construa um ${PREDIOS.pombal.nome} na Cidade para mandar cartas. Receber e responder a propostas não precisa dele.`}
          </p>
        </div>
        {escrevendoPara === null && (
          <button
            onClick={() => setEscrevendoPara('')}
            disabled={nivelPombal === 0}
            className="rounded-lg bg-ouro px-4 py-2 text-sm font-semibold text-noite hover:bg-ouro-claro disabled:cursor-not-allowed disabled:bg-couro disabled:text-pergaminho-escuro"
          >
            🕊️ Nova carta
          </button>
        )}
      </header>

      {pactosAtivos.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-[#9fd39a]/50 bg-[#9fd39a]/10 p-3 text-sm">
          {pactosAtivos.map((p) => (
            <li key={p.nome}>
              🤝 Pacto de não agressão com <b>{p.nome}</b>: falta {formatarDuracao(p.ate - agora)}
            </li>
          ))}
        </ul>
      )}

      {escrevendoPara !== null && (
        <FormularioCarta
          key={escrevendoPara}
          meuId={meuId}
          correspondentes={correspondentes}
          minhaCidade={minhaCidade}
          nivelPombal={nivelPombal}
          emVoo={emVoo}
          para={escrevendoPara || null}
          onEnviada={() => {
            setEscrevendoPara(null);
            void recarregar();
          }}
          onFechar={() => setEscrevendoPara(null)}
        />
      )}

      {aviso && (
        <p role="alert" className="rounded-lg border border-sangue/60 bg-sangue/20 px-3 py-2 text-sm">
          {aviso}
        </p>
      )}

      {visiveis.length === 0 ? (
        <p className="rounded-xl border border-couro bg-carvao/90 p-4 text-sm text-pergaminho-escuro">
          Nenhuma carta ainda. Os pombos levam suas mensagens até a cidade do outro jogador: quanto mais longe, mais demora. Uma carta
          pode levar uma proposta de pacto de não agressão.
        </p>
      ) : (
        <ul className="space-y-2">
          {visiveis.map((c) => (
            <ItemCarta
              key={c.id}
              carta={c}
              meuId={meuId}
              nomes={nomes}
              agora={agora}
              ocupado={ocupado}
              onResponderPacto={(id, aceitar) => void responderPacto(id, aceitar)}
              onEscrever={(id) => {
                setEscrevendoPara(id);
                // Quem rola é o <main> da moldura, não a janela.
                document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
