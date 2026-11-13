import {
  BALANCEAMENTO,
  RECURSOS,
  TIPOS_PREDIO,
  habitantesLivres,
  somarExercitos,
  type Especialidade,
  type Recursos,
  type TipoMissao,
  type TipoPredio,
  type TipoUnidade,
} from '@terra/regras';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import BarraRecursos from '../componentes/BarraRecursos';
import CartaoPredio from '../componentes/CartaoPredio';
import PainelHeroi from '../componentes/PainelHeroi';
import PainelMissoes from '../componentes/PainelMissoes';
import PainelQuartel from '../componentes/PainelQuartel';
import PainelTrabalhadores from '../componentes/PainelTrabalhadores';
import { useCidade } from '../lib/useCidade';
import { useGemas } from '../lib/useGemas';
import { ESPECIALIDADES_INFO, MISSOES_INFO, PREDIOS, RACAS_INFO, RECURSOS_INFO, TERRENOS_INFO, UNIDADES_INFO, formatarDuracao } from '../lib/textos';

type Aviso = { tipo: 'erro' | 'ok'; texto: string };

export default function Cidade({ sessao }: { sessao: Session }) {
  const {
    cidade,
    obras,
    tropas,
    emMarcha,
    fila,
    acampamento,
    soldados,
    bonus,
    extras,
    territorio,
    territorios,
    meusTerritorios,
    heroi,
    raca,
    guardaReal,
    missoes,
    agora,
    erro,
    comandar,
  } = useCidade(sessao.user.id);
  const { gemas, recarregar: recarregarGemas } = useGemas();
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<Aviso | null>(null);

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
    executar({ acao: 'evoluir_predio', tipo }, `${PREDIOS[tipo].nome} na fila de obras.`);
  const treinar = (tipo: TipoUnidade, quantidade: number, noAcampamento: boolean) =>
    executar(
      { acao: 'treinar_tropas', tipo, quantidade, ...(noAcampamento && acampamento ? { territorio_id: acampamento.territorioId } : {}) },
      `Treino iniciado: ${quantidade} ${UNIDADES_INFO[tipo].plural.toLowerCase()}${noAcampamento && acampamento ? `, prontos no acampamento em ${acampamento.nome}` : ''}.`,
    );
  const alocar = (alocacao: Recursos) =>
    executar({ acao: 'alocar_trabalhadores', alocacao }, 'Trabalhadores redistribuídos.');
  const recrutar = (nome: string, especialidade: Especialidade) =>
    executar(
      { acao: 'recrutar_heroi', nome, especialidade },
      `${nome}, ${ESPECIALIDADES_INFO[especialidade].nome.toLowerCase()}, se juntou a você.`,
    );
  const treinarHeroi = () => executar({ acao: 'treinar_heroi' }, 'Treino do herói começou.');
  const cancelarObra = (prontoEm: number) =>
    executar({ acao: 'cancelar_obra', pronto_em: new Date(prontoEm).toISOString() }, 'Obra cancelada. Os recursos voltaram.');
  const terminarObra = async (prontoEm: number) => {
    await executar({ acao: 'terminar_obra', pronto_em: new Date(prontoEm).toISOString() }, '⚡ Obra pronta!');
    await recarregarGemas();
  };
  const cancelarTreino = (prontoEm: number) =>
    executar({ acao: 'cancelar_treino', pronto_em: new Date(prontoEm).toISOString() }, 'Treino cancelado. Os recursos voltaram.');
  const resgatarMissao = (missao: TipoMissao) =>
    executar({ acao: 'resgatar_missao', missao }, `Recompensa recebida: ${MISSOES_INFO[missao].titulo.toLowerCase()}.`);

  if (erro) {
    return (
      <div className="grid h-full place-items-center px-4 text-center">
        <div className="space-y-3">
          <p>{erro}</p>
          <button onClick={() => location.reload()} className="text-ouro underline">
            Tentar de novo
          </button>
        </div>
      </div>
    );
  }

  if (!cidade || !bonus || !extras) {
    return <div className="grid h-full place-items-center text-pergaminho-escuro">Erguendo sua cidade…</div>;
  }

  const bonusAtivos = [
    ...RECURSOS.filter((r) => bonus[r] > 0).map((r) => `+${Math.round(bonus[r] * 100)}% ${RECURSOS_INFO[r].nome.toLowerCase()}`),
    ...(extras.producaoFixaHora.ouro > 0 ? [`+${extras.producaoFixaHora.ouro} ouro/h das cidades livres`] : []),
    ...(extras.populacaoExtra > 0 ? [`+${extras.populacaoExtra} de população das vilas`] : []),
  ].join(' · ');

  return (
    <div>
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

      <div className="mx-auto max-w-6xl px-4 pt-4">
        {territorio && (
          <p className="mb-3 text-sm text-pergaminho-escuro">
            {raca && (
              <span className="text-pergaminho">
                {RACAS_INFO[raca].icone} {RACAS_INFO[raca].nome}
                {' · '}
              </span>
            )}
            {guardaReal > 0 && <span className="text-ouro-claro">👑 Guarda Real: {guardaReal} lanceiros · </span>}
            📍 <span className="text-pergaminho">{territorio.nome}</span> ({TERRENOS_INFO[territorio.terreno].nome.toLowerCase()})
            {' · '}
            {territorios} {territorios === 1 ? 'território' : 'territórios'}
            {bonusAtivos && ` · ${bonusAtivos}`}
          </p>
        )}
        <div className="md:hidden">
          <BarraRecursos cidade={cidade} bonus={bonus} extras={extras} tropas={somarExercitos(tropas, emMarcha)} soldados={soldados} />
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-4 md:grid-cols-[1fr_320px]">
        <section>
          {missoes && (
            <PainelMissoes resgatadas={missoes.resgatadas} situacao={missoes.situacao} ocupado={ocupado} onResgatar={resgatarMissao} />
          )}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
            <h2 className="font-titulo text-lg text-ouro">Prédios</h2>
            <p className="text-xs text-pergaminho-escuro">
              Fila de obras: {obras.length}/{BALANCEAMENTO.maxObrasNaFila}
              {obras.length > 0 &&
                ` · ${obras.map((o) => PREDIOS[o.tipo].nome).join(' → ')} · tudo pronto em ${formatarDuracao(obras.at(-1)!.prontoEm - agora)}`}
              {gemas && (
                <a href="#loja" title="Suas gemas (loja)" className="ml-2 text-ouro-claro hover:underline">
                  💎 {gemas.saldo}
                </a>
              )}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {TIPOS_PREDIO.map((tipo) => (
              <CartaoPredio
                key={tipo}
                tipo={tipo}
                cidade={cidade}
                bonus={bonus}
                obras={obras}
                agora={agora}
                ocupado={ocupado}
                onEvoluir={evoluir}
                onCancelar={cancelarObra}
                gemas={gemas && { saldo: gemas.saldo, usos: gemas.usos }}
                onTerminar={(prontoEm) => void terminarObra(prontoEm)}
              />
            ))}
          </div>
        </section>

        <aside className="space-y-4 md:sticky md:top-4 md:self-start">
          <div className="hidden md:block">
            <BarraRecursos cidade={cidade} bonus={bonus} extras={extras} tropas={somarExercitos(tropas, emMarcha)} soldados={soldados} />
          </div>
          <PainelTrabalhadores cidade={cidade} bonus={bonus} soldados={soldados} ocupado={ocupado} onSalvar={alocar} />
          <PainelQuartel
            cidade={cidade}
            tropas={tropas}
            emMarcha={emMarcha}
            fila={fila}
            acampamento={acampamento}
            soldados={soldados}
            agora={agora}
            ocupado={ocupado}
            onTreinar={treinar}
            onCancelar={cancelarTreino}
          />
          <PainelHeroi
            heroi={heroi}
            cidade={cidade}
            cidadeTerritorioId={territorio?.id ?? null}
            nomeDoTerritorio={(id) => meusTerritorios.find((t) => t.id === id)?.nome ?? null}
            habitantesLivres={habitantesLivres(cidade, soldados)}
            agora={agora}
            ocupado={ocupado}
            onRecrutar={recrutar}
            onTreinar={treinarHeroi}
          />
        </aside>
      </div>
    </div>
  );
}
