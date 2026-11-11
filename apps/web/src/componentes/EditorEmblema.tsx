import { CORES_EMBLEMA, FORMAS_EMBLEMA, LIMITES_EMBLEMA, type CamadaEmblema, type FormaEmblema } from '@terra/regras';
import { useRef, useState, type PointerEvent as EventoPonteiro } from 'react';
import { NOMES_CORES } from '../lib/bandeira';
import { EMBLEMAS_PRONTOS, FORMAS, transformacaoDaCamada } from '../lib/formasEmblema';
import Emblema from './Emblema';

type Props = {
  camadas: CamadaEmblema[];
  onMudar: (camadas: CamadaEmblema[]) => void;
  /** Cor de fundo do quadro (a da bandeira), para ver o emblema como vai ficar. */
  fundo: string;
};

type Painel = 'camadas' | 'formas' | 'prontos';

const BOTAO = 'rounded-lg border border-couro px-2.5 py-1.5 text-sm text-pergaminho-escuro hover:border-ouro/60 hover:text-pergaminho disabled:opacity-40';
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function Controle({ rotulo, valor, min, max, passo = 1, sufixo, onMudar }: {
  rotulo: string;
  valor: number;
  min: number;
  max: number;
  passo?: number;
  sufixo: string;
  onMudar: (v: number) => void;
}) {
  return (
    <label className="grid grid-cols-[5.5rem_1fr_3rem] items-center gap-2 text-sm">
      <span className="text-pergaminho-escuro">{rotulo}</span>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => onMudar(Number(e.target.value))} className="accent-ouro" />
      <span className="text-right tabular-nums text-pergaminho">
        {Math.round(valor)}
        {sufixo}
      </span>
    </label>
  );
}

/**
 * Editor do emblema por camadas: até 12 formas empilhadas, cada uma com posição (arrastando no quadro ou pelos
 * controles), tamanho, rotação, cor e espelho. A camada de baixo da lista fica na frente.
 */
export default function EditorEmblema({ camadas, onMudar, fundo }: Props) {
  const [selecionada, setSelecionada] = useState<number | null>(camadas.length > 0 ? camadas.length - 1 : null);
  const [painel, setPainel] = useState<Painel>(camadas.length === 0 ? 'prontos' : 'camadas');
  const quadro = useRef<SVGSVGElement>(null);
  const arrasto = useRef<{ indice: number; dx: number; dy: number } | null>(null);
  const atual = selecionada !== null ? camadas[selecionada] : undefined;
  const cheio = camadas.length >= LIMITES_EMBLEMA.camadas;

  function mudarCamada(indice: number, parte: Partial<CamadaEmblema>) {
    onMudar(camadas.map((c, i) => (i === indice ? { ...c, ...parte } : c)));
  }

  function adicionar(forma: FormaEmblema) {
    if (cheio) return;
    const cor = atual?.cor ?? '#d4a64a';
    onMudar([...camadas, { forma, x: 50, y: 50, escala: 0.5, largura: 1, altura: 1, rotacao: 0, cor, espelhar: false }]);
    setSelecionada(camadas.length);
    setPainel('camadas');
  }

  function mover(indice: number, para: number) {
    if (para < 0 || para >= camadas.length) return;
    const nova = [...camadas];
    const [c] = nova.splice(indice, 1);
    nova.splice(para, 0, c!);
    onMudar(nova);
    setSelecionada(para);
  }

  function duplicar(indice: number) {
    if (cheio) return;
    const c = camadas[indice]!;
    const nova = [...camadas];
    nova.splice(indice + 1, 0, { ...c, x: limitar(c.x + 6, 0, 100), y: limitar(c.y + 6, 0, 100) });
    onMudar(nova);
    setSelecionada(indice + 1);
  }

  function remover(indice: number) {
    onMudar(camadas.filter((_, i) => i !== indice));
    setSelecionada(camadas.length > 1 ? Math.min(indice, camadas.length - 2) : null);
  }

  /** Posição do ponteiro no quadro de 0 a 100. */
  function pontoNoQuadro(e: EventoPonteiro<SVGSVGElement>): { x: number; y: number } {
    const r = quadro.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  }

  function comecarArrasto(e: EventoPonteiro<SVGSVGElement>) {
    // Toque numa forma seleciona a de cima naquele ponto; no vazio, arrasta a selecionada.
    const alvo = (e.target as Element).closest('[data-camada]');
    const indice = alvo ? Number(alvo.getAttribute('data-camada')) : selecionada;
    if (indice === null || !camadas[indice]) return;
    setSelecionada(indice);
    const p = pontoNoQuadro(e);
    arrasto.current = { indice, dx: camadas[indice].x - p.x, dy: camadas[indice].y - p.y };
    try {
      quadro.current!.setPointerCapture(e.pointerId);
    } catch {
      // Sem captura (ponteiro já solto): o arrasto continua enquanto o dedo estiver sobre o quadro.
    }
  }

  function arrastar(e: EventoPonteiro<SVGSVGElement>) {
    const a = arrasto.current;
    if (!a) return;
    const p = pontoNoQuadro(e);
    mudarCamada(a.indice, { x: Math.round(limitar(p.x + a.dx, 0, 100) * 10) / 10, y: Math.round(limitar(p.y + a.dy, 0, 100) * 10) / 10 });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <svg
          ref={quadro}
          viewBox="0 0 100 100"
          className="aspect-square w-full max-w-64 cursor-move touch-none rounded-xl border border-couro"
          style={{ background: fundo }}
          onPointerDown={comecarArrasto}
          onPointerMove={arrastar}
          onPointerUp={() => (arrasto.current = null)}
          onPointerCancel={() => (arrasto.current = null)}
          aria-label="Quadro do emblema: arraste para mover a camada selecionada"
        >
          {/* Guias do centro. */}
          <path d="M50 0V100M0 50H100" stroke="#1c1410" strokeOpacity={0.15} strokeWidth={0.5} />
          {camadas.map((c, i) => {
            const forma = FORMAS[c.forma];
            return (
              <path
                key={i}
                data-camada={i}
                d={forma.d}
                fill={c.cor}
                fillRule={forma.furos ? 'evenodd' : 'nonzero'}
                transform={transformacaoDaCamada(c)}
              />
            );
          })}
          {atual && (
            <path
              d={FORMAS[atual.forma].d}
              fill="none"
              stroke="#d4a64a"
              strokeWidth={1.2}
              strokeDasharray="3 2"
              vectorEffect="non-scaling-stroke"
              transform={transformacaoDaCamada(atual)}
              pointerEvents="none"
            />
          )}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {(
          [
            ['camadas', `Camadas (${camadas.length}/${LIMITES_EMBLEMA.camadas})`],
            ['formas', '＋ Forma'],
            ['prontos', 'Prontos'],
          ] as const
        ).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={painel === id}
            onClick={() => setPainel(id)}
            disabled={id === 'formas' && cheio}
            className={`${BOTAO} ${painel === id ? 'border-ouro bg-ouro/10 text-ouro' : ''}`}
          >
            {rotulo}
          </button>
        ))}
        {camadas.length > 0 && (
          <button type="button" onClick={() => (onMudar([]), setSelecionada(null))} className={`${BOTAO} ml-auto`}>
            Limpar
          </button>
        )}
      </div>

      {painel === 'formas' && (
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
          {FORMAS_EMBLEMA.map((forma) => (
            <button
              key={forma}
              type="button"
              onClick={() => adicionar(forma)}
              title={FORMAS[forma].nome}
              aria-label={`Adicionar ${FORMAS[forma].nome}`}
              className="grid aspect-square place-items-center rounded-lg border-2 border-couro bg-noite/60 p-1 hover:border-ouro/60"
            >
              <Emblema camadas={[{ forma, x: 50, y: 50, escala: 0.8, largura: 1, altura: 1, rotacao: 0, cor: '#f1e6cf', espelhar: false }]} tamanho={30} />
            </button>
          ))}
        </div>
      )}

      {painel === 'prontos' && (
        <div className="space-y-2">
          <p className="text-xs text-pergaminho-escuro">Comece de um pronto e mude o que quiser (substitui o emblema atual).</p>
          <div className="grid grid-cols-4 gap-2">
            {EMBLEMAS_PRONTOS.map((p) => (
              <button
                key={p.nome}
                type="button"
                onClick={() => {
                  onMudar(p.camadas);
                  setSelecionada(p.camadas.length - 1);
                  setPainel('camadas');
                }}
                className="flex flex-col items-center gap-1 rounded-lg border-2 border-couro p-1.5 text-[11px] text-pergaminho-escuro hover:border-ouro/60"
              >
                <span className="rounded-md" style={{ background: fundo }}>
                  <Emblema camadas={p.camadas} tamanho={52} />
                </span>
                {p.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {painel === 'camadas' && (
        <div className="space-y-3">
          {camadas.length === 0 ? (
            <p className="text-sm text-pergaminho-escuro">Sem emblema. Use “＋ Forma” ou comece de um pronto.</p>
          ) : (
            <ol className="space-y-1">
              {/* De cima (frente) para baixo (fundo), como se vê no quadro. */}
              {camadas
                .map((c, i) => ({ c, i }))
                .reverse()
                .map(({ c, i }) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 rounded-lg border px-2 py-1 ${i === selecionada ? 'border-ouro bg-ouro/10' : 'border-couro'}`}
                  >
                    <button type="button" onClick={() => setSelecionada(i)} className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm">
                      <span className="rounded bg-noite/70 p-0.5">
                        <Emblema camadas={[{ ...c, x: 50, y: 50, escala: 0.85 / Math.max(1, c.largura, c.altura) }]} tamanho={24} />
                      </span>
                      <span className="truncate">{FORMAS[c.forma].nome}</span>
                    </button>
                    <button type="button" onClick={() => mover(i, i + 1)} disabled={i === camadas.length - 1} className={BOTAO} aria-label="Trazer para a frente" title="Para a frente">
                      ▲
                    </button>
                    <button type="button" onClick={() => mover(i, i - 1)} disabled={i === 0} className={BOTAO} aria-label="Mandar para trás" title="Para trás">
                      ▼
                    </button>
                    <button type="button" onClick={() => duplicar(i)} disabled={cheio} className={BOTAO} aria-label="Duplicar camada" title="Duplicar">
                      ⧉
                    </button>
                    <button type="button" onClick={() => remover(i)} className={BOTAO} aria-label="Apagar camada" title="Apagar">
                      ✕
                    </button>
                  </li>
                ))}
            </ol>
          )}

          {atual && selecionada !== null && (
            <div className="space-y-2.5 rounded-xl border border-couro bg-noite/50 p-3">
              <Controle
                rotulo="Tamanho"
                valor={atual.escala * 100}
                min={LIMITES_EMBLEMA.escalaMinima * 100}
                max={LIMITES_EMBLEMA.escalaMaxima * 100}
                sufixo="%"
                onMudar={(v) => mudarCamada(selecionada, { escala: v / 100 })}
              />
              <Controle
                rotulo="Largura"
                valor={atual.largura * 100}
                min={LIMITES_EMBLEMA.esticarMinimo * 100}
                max={LIMITES_EMBLEMA.esticarMaximo * 100}
                sufixo="%"
                onMudar={(v) => mudarCamada(selecionada, { largura: v / 100 })}
              />
              <Controle
                rotulo="Altura"
                valor={atual.altura * 100}
                min={LIMITES_EMBLEMA.esticarMinimo * 100}
                max={LIMITES_EMBLEMA.esticarMaximo * 100}
                sufixo="%"
                onMudar={(v) => mudarCamada(selecionada, { altura: v / 100 })}
              />
              <Controle rotulo="Rotação" valor={atual.rotacao} min={0} max={359} sufixo="°" onMudar={(v) => mudarCamada(selecionada, { rotacao: v })} />
              <Controle rotulo="Horizontal" valor={atual.x} min={0} max={100} sufixo="" onMudar={(v) => mudarCamada(selecionada, { x: v })} />
              <Controle rotulo="Vertical" valor={atual.y} min={0} max={100} sufixo="" onMudar={(v) => mudarCamada(selecionada, { y: v })} />
              <label className="flex items-center gap-2 text-sm text-pergaminho-escuro">
                <input
                  type="checkbox"
                  checked={atual.espelhar}
                  onChange={(e) => mudarCamada(selecionada, { espelhar: e.target.checked })}
                  className="size-4 accent-ouro"
                />
                Espelhar
              </label>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Cor da camada">
                {CORES_EMBLEMA.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    role="radio"
                    aria-checked={atual.cor === cor}
                    onClick={() => mudarCamada(selecionada, { cor })}
                    title={NOMES_CORES[cor] ?? cor}
                    aria-label={NOMES_CORES[cor] ?? cor}
                    className={`size-7 rounded-full border-2 ${atual.cor === cor ? 'border-ouro ring-2 ring-ouro/60' : 'border-couro'}`}
                    style={{ background: cor }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
