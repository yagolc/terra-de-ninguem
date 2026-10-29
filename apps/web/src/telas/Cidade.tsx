import { TIPOS_PREDIO, type Recursos, type TipoPredio } from '@terra/regras';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import BarraRecursos from '../componentes/BarraRecursos';
import CartaoPredio from '../componentes/CartaoPredio';
import NavegacaoInferior from '../componentes/NavegacaoInferior';
import PainelTrabalhadores from '../componentes/PainelTrabalhadores';
import { supabase } from '../lib/supabase';
import { useCidade } from '../lib/useCidade';
import { PREDIOS } from '../lib/textos';

type Aviso = { tipo: 'erro' | 'ok'; texto: string };

export default function Cidade({ sessao }: { sessao: Session }) {
  const { cidade, obra, agora, erro, comandar } = useCidade(sessao.user.id);
  const [nome, setNome] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

  useEffect(() => {
    supabase
      ?.from('jogadores')
      .select('nome')
      .eq('id', sessao.user.id)
      .maybeSingle<{ nome: string }>()
      .then(({ data }) => setNome(data?.nome ?? null));
  }, [sessao.user.id]);

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(null), 5000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function executar(corpo: Record<string, unknown>, sucesso: string) {
    setOcupado(true);
    try {
      await comandar(corpo);
      setAviso({ tipo: 'ok', texto: sucesso });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Algo deu errado.' });
    } finally {
      setOcupado(false);
    }
  }

  const evoluir = (tipo: TipoPredio) =>
    executar({ acao: 'evoluir_predio', tipo }, `Obra iniciada: ${PREDIOS[tipo].nome}.`);
  const alocar = (alocacao: Recursos) =>
    executar({ acao: 'alocar_trabalhadores', alocacao }, 'Trabalhadores redistribuídos.');

  if (erro) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 text-center">
        <div className="space-y-3">
          <p>{erro}</p>
          <button onClick={() => location.reload()} className="text-ouro underline">
            Tentar de novo
          </button>
        </div>
      </main>
    );
  }

  if (!cidade) {
    return <div className="grid min-h-dvh place-items-center text-pergaminho-escuro">Erguendo sua cidade…</div>;
  }

  return (
    <div className="min-h-dvh pb-24 md:pb-8">
      <header className="sticky top-0 z-10 border-b border-couro bg-noite/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <img src="/escudo.svg" alt="" className="size-8" />
            <div>
              <h1 className="font-titulo text-lg leading-tight text-ouro">{nome ? `Cidade de ${nome}` : 'Sua cidade'}</h1>
              <p className="text-xs text-pergaminho-escuro">Temporada 1</p>
            </div>
          </div>
          <button
            onClick={() => supabase?.auth.signOut()}
            className="rounded-lg border border-couro px-3 py-1.5 text-sm text-pergaminho-escuro hover:text-pergaminho"
          >
            Sair
          </button>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <BarraRecursos cidade={cidade} />
        </div>
      </header>

      {aviso && (
        <div
          role={aviso.tipo === 'erro' ? 'alert' : 'status'}
          className={`fixed inset-x-4 top-4 z-20 mx-auto max-w-md rounded-lg border px-4 py-3 text-sm shadow-xl ${
            aviso.tipo === 'erro' ? 'border-sangue bg-[#3a1712] text-pergaminho' : 'border-musgo bg-[#1f2a17] text-pergaminho'
          }`}
        >
          {aviso.texto}
        </div>
      )}

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 font-titulo text-lg text-ouro">Prédios</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TIPOS_PREDIO.map((tipo) => (
              <CartaoPredio
                key={tipo}
                tipo={tipo}
                cidade={cidade}
                obra={obra}
                agora={agora}
                ocupado={ocupado}
                onEvoluir={evoluir}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4 md:sticky md:top-20 md:self-start">
          <div className="hidden md:block">
            <BarraRecursos cidade={cidade} />
          </div>
          <PainelTrabalhadores cidade={cidade} ocupado={ocupado} onSalvar={alocar} />
        </aside>
      </div>

      <NavegacaoInferior />
    </div>
  );
}
