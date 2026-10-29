// Simulador de batalhas no terminal, para testar o balanceamento.
// Uso (na raiz do repositório):
//   npm run simular -- --atacante 50l,20a,10c --defensor 40l,30a --terreno floresta --muralha 3
// Opções: --rodadas 1000  --semente 1  --estoque 2000,2000,1000  --armazem 1  --cidade (alvo é cidade principal)
import { parseArgs } from 'node:util';
import { geradorComSemente, sortearSorte } from '../src/aleatorio.ts';
import { forcaAtaque, forcaDefesa, resolverBatalha } from '../src/batalha.ts';
import { calcularSaque } from '../src/saque.ts';
import { RECURSOS, TERRENOS, TIPOS_UNIDADE, type Exercito, type Recursos, type Terreno, type TipoUnidade } from '../src/tipos.ts';
import { exercito, mapearExercito, mapearRecursos, recursos, totalUnidades } from '../src/util.ts';

const SIGLAS: Record<string, TipoUnidade> = { l: 'lanceiro', a: 'arqueiro', c: 'cavalaria' };
const NOMES: Record<TipoUnidade, string> = { lanceiro: 'lanceiros', arqueiro: 'arqueiros', cavalaria: 'cavalaria' };

function falhar(mensagem: string): never {
  console.error(`Erro: ${mensagem}`);
  console.error('Exemplo: npm run simular -- --atacante 50l,20a,10c --defensor 40l,30a --terreno floresta --muralha 3');
  process.exit(1);
}

/** Lê "50l,20a,10c" (l = lanceiro, a = arqueiro, c = cavalaria). */
function lerExercito(texto: string | undefined, rotulo: string): Exercito {
  if (texto === undefined) falhar(`informe --${rotulo}`);
  const resultado = exercito();
  for (const parte of texto.split(',').map((p) => p.trim()).filter(Boolean)) {
    const casamento = /^(\d+)\s*([a-z]+)$/i.exec(parte);
    const tipo = casamento ? (SIGLAS[casamento[2]!.toLowerCase()[0]!] ?? null) : null;
    if (!casamento || !tipo) falhar(`não entendi "${parte}" em --${rotulo}; use algo como 50l, 20a ou 10c`);
    resultado[tipo] += Number(casamento[1]);
  }
  return resultado;
}

function lerNumero(texto: string, rotulo: string): number {
  const valor = Number(texto);
  if (!Number.isFinite(valor) || valor < 0) falhar(`--${rotulo} precisa ser um número positivo`);
  return valor;
}

const { values: opcoes } = parseArgs({
  options: {
    atacante: { type: 'string' },
    defensor: { type: 'string' },
    terreno: { type: 'string', default: 'planicie' },
    muralha: { type: 'string', default: '0' },
    rodadas: { type: 'string', default: '1000' },
    semente: { type: 'string', default: '1' },
    estoque: { type: 'string', default: '2000,2000,1000' },
    armazem: { type: 'string', default: '1' },
    cidade: { type: 'boolean', default: false },
  },
});

const atacante = lerExercito(opcoes.atacante, 'atacante');
const defensor = opcoes.defensor === undefined ? exercito() : lerExercito(opcoes.defensor, 'defensor');
if (totalUnidades(atacante) === 0) falhar('o atacante precisa de pelo menos uma unidade');

if (!(TERRENOS as readonly string[]).includes(opcoes.terreno)) falhar(`terreno deve ser ${TERRENOS.join(', ')}`);
const terreno = opcoes.terreno as Terreno;
const nivelMuralha = lerNumero(opcoes.muralha, 'muralha');
const rodadas = Math.max(1, Math.floor(lerNumero(opcoes.rodadas, 'rodadas')));
const nivelArmazem = lerNumero(opcoes.armazem, 'armazem');
const [comida = 0, madeira = 0, ouro = 0] = opcoes.estoque.split(',').map((v) => lerNumero(v, 'estoque'));
const estoque = recursos({ comida, madeira, ouro });

// ---------------------------------------------------------------------------
const gerador = geradorComSemente(lerNumero(opcoes.semente, 'semente'));
let vitorias = 0;
let conquistas = 0;
let somaPerdasAtacante = exercito();
let somaPerdasDefensor = exercito();
let somaSaque = recursos();

for (let i = 0; i < rodadas; i++) {
  const r = resolverBatalha({ atacante, defensor, terreno, nivelMuralha, sorte: sortearSorte(gerador), alvoCidadePrincipal: opcoes.cidade });
  somaPerdasAtacante = mapearExercito((t) => somaPerdasAtacante[t] + r.perdasAtacante[t]);
  somaPerdasDefensor = mapearExercito((t) => somaPerdasDefensor[t] + r.perdasDefensor[t]);
  if (r.vencedor === 'atacante') {
    vitorias++;
    if (r.permiteConquista) conquistas++;
    const saque = calcularSaque({ estoque, nivelArmazem, sobreviventes: r.sobreviventesAtacante });
    somaSaque = mapearRecursos((rec) => somaSaque[rec] + saque[rec]);
  }
}

// ---------------------------------------------------------------------------
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });

function descreverExercito(e: Exercito): string {
  const partes = TIPOS_UNIDADE.filter((t) => e[t] > 0).map((t) => `${numero.format(e[t])} ${NOMES[t]}`);
  return partes.length > 0 ? partes.join(', ') : 'ninguém';
}

function media(soma: Exercito, total: Exercito): string {
  const porTipo = TIPOS_UNIDADE.filter((t) => total[t] > 0).map((t) => `${NOMES[t]} ${numero.format(soma[t] / rodadas)}`);
  const totalMedio = totalUnidades(soma) / rodadas;
  const fracao = totalUnidades(total) > 0 ? totalMedio / totalUnidades(total) : 0;
  return `${numero.format(totalMedio)} (${pct.format(fracao)})${porTipo.length > 1 ? `  [${porTipo.join(' | ')}]` : ''}`;
}

function descreverRecursos(r: Recursos, divisor: number): string {
  return RECURSOS.map((rec) => `${rec} ${numero.format(divisor > 0 ? r[rec] / divisor : 0)}`).join(' | ');
}

const ataqueBase = forcaAtaque(atacante, defensor);
const defesaBase = forcaDefesa(defensor, atacante, terreno, nivelMuralha);

console.log('\nTerra de Ninguém: simulação de batalha\n');
console.log(`  Atacante: ${descreverExercito(atacante)}`);
console.log(`  Defensor: ${descreverExercito(defensor)}`);
console.log(`  Terreno: ${terreno}  |  Muralha: nível ${nivelMuralha}${opcoes.cidade ? '  |  alvo: cidade principal' : ''}`);
console.log(
  `  Força sem sorte: ataque ${numero.format(ataqueBase)} × defesa ${numero.format(defesaBase)}` +
    (defesaBase > 0 ? `  (margem ${numero.format(ataqueBase / defesaBase)})` : ''),
);
console.log(`\n  ${numero.format(rodadas)} rodadas (sorte de ±10% em cada uma):\n`);
console.log(`  Vitórias do atacante:   ${pct.format(vitorias / rodadas)}`);
console.log(`  Conquista possível:     ${opcoes.cidade ? 'nunca (cidade principal)' : pct.format(conquistas / rodadas)}`);
console.log(`  Perdas médias atacante: ${media(somaPerdasAtacante, atacante)}`);
console.log(`  Perdas médias defensor: ${media(somaPerdasDefensor, defensor)}`);
console.log(
  `  Saque médio por vitória: ${vitorias > 0 ? descreverRecursos(somaSaque, vitorias) : 'sem vitórias'}` +
    `  (estoque ${descreverRecursos(estoque, 1)}, armazém nível ${nivelArmazem})\n`,
);
