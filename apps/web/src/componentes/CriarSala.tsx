import { BALANCEAMENTO } from '@terra/regras';
import type { MapaGerado } from '@terra/regras/mapa';
import { useState } from 'react';
import { criarSala } from '../lib/salas';
import Botao from './Botao';
import Icone from './Icone';

type Props = {
  meuId: string;
  jogadores: { id: string; nome: string }[];
  /** Sala criada: abre ela. */
  onCriada: (salaId: string) => void;
};

const CORES_TERRENO = { planicie: '#8a9a4b', floresta: '#3f6b3a', montanha: '#7d6f63' } as const;
const campo = 'w-full rounded-lg border border-couro bg-noite px-3 py-2 text-pergaminho focus:border-ouro focus:outline-none';

/** Prévia do mapa: terreno de cada território, vagas iniciais (círculos), vilas 🏘, cidades livres ⚖, rios e cordilheiras. */
function PreviaMapa({ mapa }: { mapa: MapaGerado }) {
  const pontos = (p: readonly (readonly [number, number])[]) => p.map(([x, y]) => `${x},${y}`).join(' ');
  // Aresta que dois vizinhos dividem: onde passa o rio ou a cordilheira.
  const arestas = new Map<string, { a: readonly [number, number]; b: readonly [number, number]; donos: number[] }>();
  for (const t of mapa.territorios) {
    t.poligono.forEach((a, i) => {
      const b = t.poligono[(i + 1) % t.poligono.length]!;
      const chave = [a.join(','), b.join(',')].sort().join('|');
      const aresta = arestas.get(chave) ?? { a, b, donos: [] };
      aresta.donos.push(t.indice);
      arestas.set(chave, aresta);
    });
  }
  const barreiras = mapa.barreiras.flatMap(({ a, b, tipo }) =>
    [...arestas.values()].filter((e) => e.donos.includes(a) && e.donos.includes(b)).map((e) => ({ ...e, tipo })),
  );
  return (
    <svg viewBox={`-1 -1 ${mapa.largura + 2} ${mapa.altura + 2}`} className="w-full rounded-lg bg-noite" role="img" aria-label="Prévia do mapa">
      {mapa.territorios.map((t) => (
        <polygon key={t.indice} points={pontos(t.poligono)} fill={CORES_TERRENO[t.terreno]} stroke="#2a1f19" strokeWidth={0.08} />
      ))}
      {barreiras.map((e, i) => (
        <line
          key={i}
          x1={e.a[0]}
          y1={e.a[1]}
          x2={e.b[0]}
          y2={e.b[1]}
          stroke={e.tipo === 'rio' ? '#3a7bd5' : '#2b2622'}
          strokeWidth={e.tipo === 'rio' ? 0.4 : 0.5}
          strokeLinecap="round"
        />
      ))}
      {mapa.iniciais.map((indice) => {
        const t = mapa.territorios[indice]!;
        return <circle key={indice} cx={t.x} cy={t.y} r={0.9} fill="#d4a64a" stroke="#f1e6cf" strokeWidth={0.2} />;
      })}
      {mapa.povoados.map((p) => {
        const t = mapa.territorios[p.indice]!;
        return (
          <text key={p.indice} x={t.x} y={t.y + 0.6} fontSize={1.6} textAnchor="middle">
            {p.tipo === 'vila' ? <Icone de="🏘" /> : <Icone de="⚖" />}
          </text>
        );
      })}
    </svg>
  );
}

/** Criar sala (só o organizador): nome, acesso, jogadores, duração, semente com prévia do mapa e convidados. */
export default function CriarSala({ meuId, jogadores, onCriada }: Props) {
  const s = BALANCEAMENTO.salas;
  const [nome, setNome] = useState('');
  const [acesso, setAcesso] = useState<'aberta' | 'convite'>('aberta');
  const [jogadoresMaximo, setJogadoresMaximo] = useState(4);
  const [duracaoDias, setDuracaoDias] = useState(7);
  const [semente, setSemente] = useState('');
  const [convidados, setConvidados] = useState<string[]>([]);
  const [previa, setPrevia] = useState<MapaGerado | null>(null);
  const [ocupado, setOcupado] = useState<'previa' | 'criar' | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const sementeNumero = semente.trim() === '' ? null : Number(semente);

  async function verPrevia() {
    setOcupado('previa');
    setErro(null);
    // Sem semente, sorteia uma e deixa no campo: a sala criada terá exatamente este mapa.
    const base = sementeNumero ?? Math.floor(Math.random() * 1_000_000);
    if (sementeNumero === null) setSemente(String(base));
    try {
      // O gerador (com o d3-delaunay) só é baixado aqui.
      const { escolherMelhorMapa } = await import('@terra/regras/mapa');
      setPrevia(escolherMelhorMapa({ sementeBase: base, jogadores: jogadoresMaximo }).mapa);
    } catch {
      setErro('Não foi possível gerar a prévia.');
    } finally {
      setOcupado(null);
    }
  }

  async function criar() {
    setOcupado('criar');
    setErro(null);
    try {
      const r = await criarSala({ nome, acesso, jogadoresMaximo, duracaoDias, semente: sementeNumero, convidados });
      onCriada(r.sala_id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível criar a sala.');
      setOcupado(null);
    }
  }

  return (
    <section className="space-y-3 rounded-xl border border-couro bg-noite/50 p-4">
      <h3 className="font-titulo text-lg text-ouro">Criar sala</h3>
      <label className="block space-y-1 text-sm">
        <span className="text-pergaminho-escuro">Nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={s.nomeMaximo} className={campo} />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="text-pergaminho-escuro">Jogadores (o mapa é feito para eles)</span>
          <select
            value={jogadoresMaximo}
            onChange={(e) => {
              setJogadoresMaximo(Number(e.target.value));
              setPrevia(null);
            }}
            className={campo}
          >
            {Array.from({ length: BALANCEAMENTO.mapa.jogadoresMaximo - s.jogadoresMinimo + 1 }, (_, i) => s.jogadoresMinimo + i).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-pergaminho-escuro">
            Dias de temporada ({s.duracaoMinimaDias} a {s.duracaoMaximaDias})
          </span>
          <input
            type="number"
            min={s.duracaoMinimaDias}
            max={s.duracaoMaximaDias}
            value={duracaoDias}
            onChange={(e) => setDuracaoDias(Number(e.target.value))}
            className={campo}
          />
        </label>
      </div>

      <fieldset className="space-y-1 text-sm">
        <legend className="text-pergaminho-escuro">Quem entra</legend>
        <label className="mr-4 inline-flex items-center gap-1.5">
          <input type="radio" checked={acesso === 'aberta'} onChange={() => setAcesso('aberta')} /> Qualquer jogador, até lotar
        </label>
        <label className="inline-flex items-center gap-1.5">
          <input type="radio" checked={acesso === 'convite'} onChange={() => setAcesso('convite')} /> Só convidados
        </label>
      </fieldset>

      {acesso === 'convite' && (
        <fieldset className="space-y-1 text-sm">
          <legend className="text-pergaminho-escuro">Convidados (você entra sempre)</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {jogadores
              .filter((j) => j.id !== meuId)
              .map((j) => (
                <label key={j.id} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={convidados.includes(j.id)}
                    onChange={() => setConvidados((c) => (c.includes(j.id) ? c.filter((x) => x !== j.id) : [...c, j.id]))}
                  />
                  {j.nome}
                </label>
              ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="block flex-1 space-y-1 text-sm">
          <span className="text-pergaminho-escuro">Semente do mapa (vazio: sorteia)</span>
          <input
            inputMode="numeric"
            value={semente}
            onChange={(e) => {
              setSemente(e.target.value.replace(/\D/g, '').slice(0, 9));
              setPrevia(null);
            }}
            className={campo}
          />
        </label>
        <div className="w-36">
          <Botao variante="discreto" disabled={ocupado !== null} onClick={() => void verPrevia()}>
            {ocupado === 'previa' ? 'Gerando…' : 'Ver prévia'}
          </Botao>
        </div>
      </div>

      {previa && (
        <div className="space-y-1">
          <PreviaMapa mapa={previa} />
          <p className="text-xs text-pergaminho-escuro">
            Semente {semente}: {previa.territorios.length} territórios, {previa.regioes.length} regiões. Círculos dourados: cidades iniciais;
            <Icone de="🏘" /> vila; <Icone de="⚖" /> cidade livre; azul: rio; preto: cordilheira.
          </p>
        </div>
      )}

      {erro && <p className="rounded-lg border border-sangue/60 bg-sangue/10 px-3 py-2 text-sm">{erro}</p>}
      <Botao disabled={ocupado !== null || nome.trim() === ''} onClick={() => void criar()}>
        {ocupado === 'criar' ? 'Criando a sala…' : 'Criar sala e começar a temporada 1'}
      </Botao>
    </section>
  );
}
