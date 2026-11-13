import { AREAS_REPORTE, BALANCEAMENTO, GRAVIDADES, reportesParecidos, type AreaReporte, type Gravidade, type TipoReporte } from '@terra/regras';
import { useMemo, useState, type ReactNode } from 'react';
import { AREAS_INFO, GRAVIDADES_INFO, STATUS_INFO, TIPOS_REPORTE_INFO, contextoDoAparelho, type ItemReporte } from '../lib/reportes';

type Props = {
  tipo: TipoReporte;
  existentes: ItemReporte[];
  /** Aba de onde o jogador veio (vai no contexto do relato). */
  abaDeOrigem: string;
  onEnviar: (corpo: Record<string, unknown>) => Promise<number>;
  onVer: (numero: number) => void;
  onCancelar: () => void;
};

const CAMPO = 'w-full rounded-lg border border-couro bg-noite px-3 py-2 text-sm text-pergaminho focus:border-ouro focus:outline-none';

function Rotulo({ texto, dica, children }: { texto: string; dica?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm text-pergaminho">{texto}</span>
      {dica && <span className="block text-xs text-pergaminho-escuro">{dica}</span>}
      {children}
    </label>
  );
}

/**
 * Formulário de relato no padrão dos rastreadores de bug: título, área e, no bug, gravidade, o que aconteceu, o que
 * esperava e os passos para reproduzir; na sugestão, o problema e como funcionaria. Mostra relatos parecidos antes
 * de enviar (votar num que já existe é melhor que repetir) e anexa os dados do aparelho.
 */
export default function FormularioReporte({ tipo, existentes, abaDeOrigem, onEnviar, onVer, onCancelar }: Props) {
  const [titulo, setTitulo] = useState('');
  const [area, setArea] = useState<AreaReporte | ''>('');
  const [gravidade, setGravidade] = useState<Gravidade | ''>('');
  const [aconteceu, setAconteceu] = useState('');
  const [esperado, setEsperado] = useState('');
  const [passos, setPassos] = useState('');
  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const contexto = useMemo(() => contextoDoAparelho(abaDeOrigem), [abaDeOrigem]);
  const parecidos = useMemo(
    () => (titulo.trim().length >= 4 ? reportesParecidos(titulo, existentes.filter((r) => r.tipo === tipo)) : []),
    [titulo, existentes, tipo],
  );
  const { tituloMaximo, textoMaximo } = BALANCEAMENTO.reportes;
  const bug = tipo === 'bug';

  async function enviar() {
    setEnviando(true);
    setErro(null);
    try {
      const numero = await onEnviar({ tipo, area, titulo, gravidade: bug ? gravidade : undefined, aconteceu, esperado, passos, descricao, contexto });
      onVer(numero);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não deu certo. Tente de novo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-ouro/50 bg-carvao/95 p-4">
      <h3 className="font-titulo text-lg text-ouro">
        {TIPOS_REPORTE_INFO[tipo].icone} {bug ? 'Relatar um bug' : 'Sugerir uma ideia'}
      </h3>

      <Rotulo texto="Título" dica={bug ? 'Resumo do problema. Ex.: "Mapa fica preto ao abrir no celular"' : 'Ex.: "Poder renomear territórios"'}>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={tituloMaximo} className={CAMPO} />
      </Rotulo>

      {parecidos.length > 0 && (
        <div className="space-y-1 rounded-lg border border-ouro/40 bg-ouro/5 p-3 text-sm">
          <p className="text-ouro-claro">Já existe algo parecido? Se for o mesmo, abra e vote 👍 em vez de repetir:</p>
          {parecidos.map((r) => (
            <button key={r.id} type="button" onClick={() => onVer(r.numero)} className="block text-left hover:underline">
              #{r.numero} {r.titulo} <span className="text-xs text-pergaminho-escuro">· {STATUS_INFO[r.status].nome} · 👍 {r.votos}</span>
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Rotulo texto="Parte do jogo">
          <select value={area} onChange={(e) => setArea(e.target.value as AreaReporte)} className={CAMPO}>
            <option value="" disabled>
              Escolha…
            </option>
            {AREAS_REPORTE.map((a) => (
              <option key={a} value={a}>
                {AREAS_INFO[a]}
              </option>
            ))}
          </select>
        </Rotulo>
        {bug && (
          <Rotulo texto="Quanto atrapalha?">
            <select value={gravidade} onChange={(e) => setGravidade(e.target.value as Gravidade)} className={CAMPO}>
              <option value="" disabled>
                Escolha…
              </option>
              {GRAVIDADES.map((g) => (
                <option key={g} value={g}>
                  {GRAVIDADES_INFO[g].nome}: {GRAVIDADES_INFO[g].dica}
                </option>
              ))}
            </select>
          </Rotulo>
        )}
      </div>

      {bug ? (
        <>
          <Rotulo texto="O que aconteceu?" dica="Mensagem de erro, número errado, botão que não responde…">
            <textarea value={aconteceu} onChange={(e) => setAconteceu(e.target.value)} rows={3} maxLength={textoMaximo} className={CAMPO} />
          </Rotulo>
          <Rotulo texto="O que você esperava?">
            <textarea value={esperado} onChange={(e) => setEsperado(e.target.value)} rows={2} maxLength={textoMaximo} className={CAMPO} />
          </Rotulo>
          <Rotulo texto="Passos para acontecer de novo (opcional)" dica={'Ex.: "1. Abrir o Mapa  2. Tocar num território  3. Mandar ataque"'}>
            <textarea value={passos} onChange={(e) => setPassos(e.target.value)} rows={3} maxLength={textoMaximo} className={CAMPO} />
          </Rotulo>
        </>
      ) : (
        <Rotulo texto="Como seria a ideia?" dica="Qual problema ela resolve e como funcionaria no jogo.">
          <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={5} maxLength={textoMaximo} className={CAMPO} />
        </Rotulo>
      )}

      {bug && (
        <p className="text-xs text-pergaminho-escuro">
          Vai junto: {contexto.navegador} no {contexto.sistema}, tela {contexto.tela}, versão {contexto.versao}, aba {contexto.aba}
          {contexto.instalado === 'sim' ? ', app instalado' : ''}.
        </p>
      )}

      {erro && <p className="text-sm text-red-300">{erro}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void enviar()}
          disabled={enviando}
          className="rounded-lg bg-ouro px-4 py-2 text-sm font-semibold text-noite hover:bg-ouro-claro disabled:bg-couro disabled:text-pergaminho-escuro"
        >
          {enviando ? 'Enviando…' : 'Enviar'}
        </button>
        <button onClick={onCancelar} className="rounded-lg border border-couro px-4 py-2 text-sm text-pergaminho-escuro hover:text-pergaminho">
          Cancelar
        </button>
      </div>
    </section>
  );
}
