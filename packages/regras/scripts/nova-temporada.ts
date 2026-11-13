// Cria uma temporada nova com mapa gerado. Uso (na raiz do repositório):
//   npm run temporada:nova                      # gera e salva a prévia, sem gravar nada
//   npm run temporada:nova -- --semente 1234    # outra semente
//   npm run temporada:nova -- --semente 1234 --aplicar   # encerra a temporada ativa e grava a nova
// Usa o login da CLI do Supabase (npx supabase login + link), sem chave secreta.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { BALANCEAMENTO } from '../src/balanceamento.ts';
import { escolherMelhorMapa, type MapaGerado, type Ponto2 } from '../src/mapa/gerador.ts';
import { CORES_LOJA } from '../src/loja.ts';
import { CORES_JOGADORES, escolherCor, grafoDeFronteiras } from '../src/territorios.ts';
import { TIPOS_UNIDADE } from '../src/tipos.ts';
import { totalUnidades } from '../src/util.ts';

const RAIZ = fileURLToPath(new URL('../../../', import.meta.url));
const PASTA_SAIDA = `${RAIZ}supabase/.temp`;
const CORES_TERRENO = { planicie: '#8a9a4b', floresta: '#3f6b3a', montanha: '#7d6f63' } as const;
const NOMES_TERRENO = { planicie: 'planície', floresta: 'floresta', montanha: 'montanha' } as const;

type Jogador = { id: string; nome: string; cor: string | null };

function consultar<T>(sql: string): T[] {
  const saida = execSync(`npx supabase db query --linked "${sql.replace(/"/g, '\\"')}"`, {
    cwd: RAIZ,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return (JSON.parse(saida.slice(saida.indexOf('{'), saida.lastIndexOf('}') + 1)) as { rows: T[] }).rows;
}

const { values: opcoes } = parseArgs({
  options: {
    semente: { type: 'string' },
    jogadores: { type: 'string' },
    aplicar: { type: 'boolean', default: false },
  },
});

// Contas bloqueadas (quem saiu do grupo: `auth.users.banned_until`) não ganham vaga. Numa linha só: no Windows a
// quebra de linha corta o comando do `consultar`.
const jogadores = consultar<Jogador>(
  'select j.id, j.nome, j.cor from public.jogadores j join auth.users u on u.id = j.id' +
    ' where u.banned_until is null or u.banned_until < now() order by j.criado_em',
);
const quantos = opcoes.jogadores ? Number(opcoes.jogadores) : jogadores.length;
if (quantos < 1 || quantos > BALANCEAMENTO.mapa.jogadoresMaximo) {
  console.error(`Erro: o mapa é para 1 a ${BALANCEAMENTO.mapa.jogadoresMaximo} jogadores (há ${jogadores.length} cadastrados).`);
  process.exit(1);
}
const sementeBase = opcoes.semente ? Number(opcoes.semente) : Math.floor(Math.random() * 1_000_000);
const { mapa, avaliacao } = escolherMelhorMapa({ sementeBase, jogadores: quantos });
// Jogadores a mais (com --jogadores menor) entram depois como retardatários.
const participantes = jogadores.slice(0, quantos);
// Cada um mantém a cor do perfil; quem não tem cor ou repetiu a de alguém antes na lista ganha a primeira livre.
const coresDosParticipantes: string[] = [];
for (const j of participantes) {
  const propria = j.cor?.toLowerCase();
  // Cores da loja (ouro, prata) só aparecem em quem comprou: o servidor confere ao salvar o perfil.
  const valida = ([...CORES_JOGADORES, ...Object.values(CORES_LOJA)] as string[]).includes(propria ?? '');
  const livre = propria && valida && !coresDosParticipantes.includes(propria);
  coresDosParticipantes.push(livre ? propria : escolherCor(coresDosParticipantes));
}

// ---------------------------------------------------------------------------
// Resumo no terminal
// ---------------------------------------------------------------------------
const grafo = grafoDeFronteiras(mapa.fronteiras);
console.log(`\nTerra de Ninguém: nova temporada (semente ${sementeBase} → mapa ${mapa.semente})\n`);
console.log(
  `  ${mapa.territorios.length} territórios, ${mapa.fronteiras.length} fronteiras, ` +
    `${mapa.barreiras.filter((b) => b.tipo === 'rio').length} rios e ${mapa.barreiras.filter((b) => b.tipo === 'montanha').length} cordilheiras, ` +
    `${mapa.regioes.length} regiões:`,
);
for (const r of mapa.regioes) {
  const n = mapa.territorios.filter((t) => t.regiao === r.indice).length;
  console.log(`    ${r.nome.padEnd(24)} ${String(n).padStart(2)} territórios (${NOMES_TERRENO[r.terreno]})`);
}
console.log('\n  Cidades iniciais:');
mapa.iniciais.forEach((indice, j) => {
  const t = mapa.territorios[indice]!;
  const nome = participantes[j]?.nome ?? `(vaga ${j + 1})`;
  console.log(
    `    ${nome.padEnd(16)} ${t.nome.padEnd(24)} ${NOMES_TERRENO[t.terreno].padEnd(9)} ` +
      `${(grafo.get(indice) ?? []).length} vizinhos · área ${avaliacao.areas[j]!.toFixed(1)}`,
  );
});
console.log(
  `\n  Menor distância entre cidades: ${avaliacao.menorDistanciaEntreCidades} fronteiras · ` +
    `desequilíbrio de áreas: ${avaliacao.desequilibrio.toFixed(1)}`,
);

// ---------------------------------------------------------------------------
// Prévia em SVG
// ---------------------------------------------------------------------------
function previaSvg(m: MapaGerado): string {
  const escala = 20;
  const pontos = (p: Ponto2[]) => p.map(([x, y]) => `${(x * escala).toFixed(1)},${(y * escala).toFixed(1)}`).join(' ');
  // Arestas entre regiões diferentes (ou na borda do mapa) ficam mais grossas.
  const arestas = new Map<string, { a: Ponto2; b: Ponto2; donos: number[] }>();
  for (const t of m.territorios) {
    t.poligono.forEach((a, i) => {
      const b = t.poligono[(i + 1) % t.poligono.length]!;
      const chave = [a.join(','), b.join(',')].sort().join('|');
      const aresta = arestas.get(chave) ?? { a, b, donos: [] };
      aresta.donos.push(t.indice);
      arestas.set(chave, aresta);
    });
  }
  const bordasRegiao = [...arestas.values()]
    .filter((e) => e.donos.length === 1 || m.territorios[e.donos[0]!]!.regiao !== m.territorios[e.donos[1]!]!.regiao)
    .map((e) => `<line x1="${e.a[0] * escala}" y1="${e.a[1] * escala}" x2="${e.b[0] * escala}" y2="${e.b[1] * escala}"/>`)
    .join('');
  // Rios (azul) e cordilheiras (cinza-escuro) por cima da borda das regiões, na aresta que os dois vizinhos dividem.
  const barreiras = m.barreiras
    .flatMap(({ a, b, tipo }) =>
      [...arestas.values()]
        .filter((e) => e.donos.length === 2 && e.donos.includes(a) && e.donos.includes(b))
        .map(
          (e) =>
            `<line x1="${e.a[0] * escala}" y1="${e.a[1] * escala}" x2="${e.b[0] * escala}" y2="${e.b[1] * escala}" ` +
            (tipo === 'rio' ? 'stroke="#3a7bd5" stroke-width="7"' : 'stroke="#2b2622" stroke-width="9"') +
            ' stroke-linecap="round"/>',
        ),
    )
    .join('');

  const corpo = m.territorios
    .map((t) => {
      const jogador = m.iniciais.indexOf(t.indice);
      const tropas = totalUnidades(t.guarnicao);
      const povoado = m.povoados.find((p) => p.indice === t.indice);
      const cx = t.x * escala;
      const cy = t.y * escala;
      return (
        `<polygon points="${pontos(t.poligono)}" fill="${CORES_TERRENO[t.terreno]}" stroke="#2a1f19" stroke-width="1"/>` +
        (jogador >= 0
          ? `<circle cx="${cx}" cy="${cy - 6}" r="11" fill="${coresDosParticipantes[jogador] ?? CORES_JOGADORES[jogador]}" stroke="#f1e6cf" stroke-width="2"/>` +
            `<text x="${cx}" y="${cy + 20}" class="jogador">${participantes[jogador]?.nome ?? `vaga ${jogador + 1}`}</text>`
          : `<text x="${cx}" y="${cy + 16}" class="tropas">${povoado ? (povoado.tipo === 'vila' ? '🏘 ' : '⚖ ') : ''}⚔ ${tropas}</text>`) +
        `<text x="${cx}" y="${cy + (jogador >= 0 ? 34 : 2)}" class="nome">${t.nome}</text>`
      );
    })
    .join('');

  const largura = m.largura * escala;
  const altura = m.altura * escala;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-10 -10 ${largura + 20} ${altura + 60}">
<style>text{font-family:Georgia,serif;text-anchor:middle;fill:#f1e6cf;paint-order:stroke;stroke:#1c1410;stroke-width:3px}
.nome{font-size:11px}.tropas{font-size:10px;fill:#e8c475}.jogador{font-size:13px;font-weight:bold}</style>
<rect x="-10" y="-10" width="${largura + 20}" height="${altura + 60}" fill="#1c1410"/>
${corpo}<g stroke="#e8c475" stroke-width="3" stroke-linecap="round">${bordasRegiao}</g>${barreiras}
<text x="${largura / 2}" y="${altura + 32}" style="font-size:14px">Semente ${m.semente} · planície (verde-claro), floresta (verde-escuro), montanha (cinza) · ⚔ = bárbaros · 🏘 vila · ⚖ cidade livre · rio (azul) e cordilheira (preto): não dá para passar</text>
</svg>`;
}

mkdirSync(PASTA_SAIDA, { recursive: true });
writeFileSync(`${PASTA_SAIDA}/previa-temporada.svg`, previaSvg(mapa));
console.log(`\n  Prévia: supabase/.temp/previa-temporada.svg`);

// ---------------------------------------------------------------------------
// Gravação
// ---------------------------------------------------------------------------

const texto = (s: string) => `'${s.replace(/'/g, "''")}'`;
const idTemporada = randomUUID();
const idsRegioes = mapa.regioes.map(() => randomUUID());
const idsTerritorios = mapa.territorios.map(() => randomUUID());

const valoresRegioes = mapa.regioes
  .map((r) => `(${texto(idsRegioes[r.indice]!)}, t, ${r.indice}, ${texto(r.nome)}, ${texto(r.terreno)})`)
  .join(',\n    ');
const valoresTerritorios = mapa.territorios
  .map((t) => {
    const jogador = mapa.iniciais.indexOf(t.indice);
    const reservado = jogador >= 0 && participantes[jogador] ? texto(participantes[jogador].id) : 'null';
    const guarnicao = Object.fromEntries(TIPOS_UNIDADE.map((tipo) => [tipo, t.guarnicao[tipo]]));
    return (
      `(${texto(idsTerritorios[t.indice]!)}, t, ${texto(idsRegioes[t.regiao]!)}, ${t.indice}, ${texto(t.nome)}, ` +
      `${texto(t.terreno)}, ${texto(t.bonus)}, ${t.x}, ${t.y}, ${texto(JSON.stringify(t.poligono))}::jsonb, ` +
      `${reservado}, ${jogador >= 0}, ${texto(JSON.stringify(guarnicao))}::jsonb)`
    );
  })
  .join(',\n    ');
const valoresFronteiras = mapa.fronteiras
  .map(([a, b]) => [idsTerritorios[a]!, idsTerritorios[b]!].sort())
  .map(([a, b]) => `(t, ${texto(a!)}, ${texto(b!)})`)
  .join(',\n    ');
const valoresBarreiras = mapa.barreiras
  .map(({ a, b, tipo }) => {
    const [x, y] = [idsTerritorios[a]!, idsTerritorios[b]!].sort();
    return `(t, ${texto(x!)}, ${texto(y!)}, ${texto(tipo)})`;
  })
  .join(',\n    ');
// Bárbaros: uma linha de tropas sem dono em cada território neutro com guarnição.
const valoresBarbaros = mapa.territorios
  .filter((t) => totalUnidades(t.guarnicao) > 0)
  .map((t) => {
    const g = t.guarnicao;
    return `(t, ${texto(idsTerritorios[t.indice]!)}, null, ${g.lanceiro}, ${g.arqueiro}, ${g.cavalaria})`;
  })
  .join(',\n    ');
const valoresPovoados = mapa.povoados
  .map((p) => `(t, ${texto(idsTerritorios[p.indice]!)}, ${texto(p.tipo)})`)
  .join(',\n    ');
const coresJogadores = participantes
  .map((j, i) => `  update public.jogadores set cor = ${texto(coresDosParticipantes[i]!)} where id = ${texto(j.id)};`)
  .join('\n');

// Um bloco DO roda tudo numa transação só: ou a temporada inteira é criada, ou nada muda.
const sql = `do $$
declare
  t uuid := ${texto(idTemporada)};
begin
  update public.temporadas set status = 'encerrada' where status = 'ativa';
  insert into public.temporadas (id, numero, status, semente, inicio, fim_previsto)
    values (t, (select coalesce(max(numero), 0) + 1 from public.temporadas), 'ativa', ${mapa.semente}, now(), now() + interval '${BALANCEAMENTO.temporada.duracaoDias} days');
  insert into public.regioes (id, temporada_id, indice, nome, terreno) values
    ${valoresRegioes};
  insert into public.territorios (id, temporada_id, regiao_id, indice, nome, terreno, bonus_recurso, x, y, poligono, reservado_para, vaga_inicial, guarnicao_inicial) values
    ${valoresTerritorios};
  insert into public.fronteiras (temporada_id, territorio_a, territorio_b) values
    ${valoresFronteiras};
${valoresBarreiras ? `  insert into public.barreiras (temporada_id, territorio_a, territorio_b, tipo) values\n    ${valoresBarreiras};` : ''}
  insert into public.tropas (temporada_id, territorio_id, dono_id, lanceiro, arqueiro, cavalaria) values
    ${valoresBarbaros};
  insert into public.povoados (temporada_id, territorio_id, tipo) values
    ${valoresPovoados};
${coresJogadores}
end $$;
`;

writeFileSync(`${PASTA_SAIDA}/nova-temporada.sql`, sql);
if (!opcoes.aplicar) {
  const jogadoresOpcao = opcoes.jogadores ? ` --jogadores ${quantos}` : '';
  console.log(
    `  SQL: supabase/.temp/nova-temporada.sql\n\n  Nada foi gravado. Para criar a temporada:` +
      ` npm run temporada:nova -- --semente ${sementeBase}${jogadoresOpcao} --aplicar\n`,
  );
  process.exit(0);
}
execSync('npx supabase db query --linked --file supabase/.temp/nova-temporada.sql', { cwd: RAIZ, stdio: ['ignore', 'ignore', 'inherit'] });
const [criada] = consultar<{ numero: number }>(`select numero from public.temporadas where id = '${idTemporada}'`);
console.log(`\n  Temporada ${criada?.numero} criada e ativa. A anterior foi encerrada.\n`);
