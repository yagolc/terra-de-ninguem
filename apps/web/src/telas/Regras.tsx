import { BALANCEAMENTO, BONUS_DO_TERRENO, TIPOS_UNIDADE, capacidadeArmazem, limitePopulacao, protecaoArmazem } from '@terra/regras';
import type { ReactNode } from 'react';
import { PREDIOS, RECURSOS_INFO, TERRENOS_INFO, UNIDADES_INFO } from '../lib/textos';

const B = BALANCEAMENTO;
const pct = (fracao: number) => `${Math.round(fracao * 100)}%`;
const num = (valor: number) => valor.toLocaleString('pt-BR');
const custo = (c: { comida: number; madeira: number; ouro: number }) =>
  (['comida', 'madeira', 'ouro'] as const)
    .filter((r) => c[r] > 0)
    .map((r) => `${c[r]} ${RECURSOS_INFO[r].icone}`)
    .join(' ');

/** Tela Regras: como o jogo funciona. Os números vêm do balanceamento, então acompanham os ajustes. */
export default function Regras() {
  const maxCasa = B.predios.casa.nivelMaximo;
  return (
    <div className="mx-auto max-w-2xl space-y-3 px-4 py-6">
      <header className="mb-2">
        <h2 className="font-titulo text-lg text-ouro">Como jogar</h2>
        <p className="text-sm text-pergaminho-escuro">
          Toque num assunto para abrir. Os números são os desta temporada e podem mudar com o balanceamento.
        </p>
      </header>

      <Secao icone="🎯" titulo="O objetivo" aberta>
        <p>
          Cada temporada dura <b>{B.temporada.duracaoDias} dias</b>. Ao entrar, você recebe um <b>objetivo secreto</b> (aba Objetivo). Quem
          cumprir o seu primeiro vence na hora, e todas as cartas são reveladas.
        </p>
        <p>
          Se o prazo acabar sem ninguém cumprir, vence quem tiver mais pontos: <b>{B.pontos.porTerritorio}</b> por território,{' '}
          <b>{B.pontos.porHabitante}</b> por habitante e <b>{B.pontos.porVitoria}</b> por batalha vencida (atacando ou defendendo).
        </p>
        <p>
          A cidade evolui sozinha, mesmo com você longe. Entrar 5 a 10 minutos algumas vezes por dia já basta: encha as filas, mande as
          tropas e volte depois.
        </p>
      </Secao>

      <Secao icone="🏰" titulo="Cidade e recursos">
        <p>
          São três recursos: {RECURSOS_INFO.comida.icone} comida (Fazenda), {RECURSOS_INFO.madeira.icone} madeira (Serraria) e{' '}
          {RECURSOS_INFO.ouro.icone} ouro (Mercado). Eles só são produzidos por <b>trabalhadores</b>: cada nível do prédio abre{' '}
          {B.producao.trabalhadoresPorNivel} vagas e dá +{pct(B.producao.bonusPorNivel)} de produção.
        </p>
        <p>
          <b>Cada habitante é trabalhador ou soldado, nunca os dois.</b> Quem vai para o quartel sai da produção. A população cresce
          sozinha até o limite das Casas ({limitePopulacao(0)} sem Casa, até {limitePopulacao(maxCasa)} com Casa nível {maxCasa}).
        </p>
        <p>
          Até <b>{B.maxObrasNaFila} obras</b> esperam na fila e são feitas uma depois da outra. Nenhum prédio passa do nível do Centro da
          Cidade.
        </p>
        <ul className="space-y-1">
          {(Object.keys(PREDIOS) as (keyof typeof PREDIOS)[]).map((p) => (
            <li key={p}>
              {PREDIOS[p].icone} <b>{PREDIOS[p].nome}:</b> {PREDIOS[p].descricao}
            </li>
          ))}
        </ul>
        <p>
          O Armazém guarda {num(capacidadeArmazem(0))} de cada recurso sem nível e +{num(B.armazem.capacidadePorNivel)} por nível. Ele
          também esconde uma parte que nenhum saque leva ({num(protecaoArmazem(0))} sem nível, +{num(B.armazem.protecaoPorNivel)} por
          nível).
        </p>
      </Secao>

      <Secao icone="⚔️" titulo="Exército">
        <p>
          O Quartel treina as tropas. Até <b>{B.treino.maxLotesNaFila} lotes</b> esperam na fila, e cada nível do Quartel acima do 1
          treina {pct(B.treino.reducaoPorNivelQuartel)} mais rápido (até {pct(B.treino.reducaoMaxima)}).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-pergaminho-escuro">
              <tr>
                <th className="py-1 pr-2 font-medium">Unidade</th>
                <th className="px-1 font-medium">Ataque</th>
                <th className="px-1 font-medium">Defesa</th>
                <th className="px-1 font-medium">Carga</th>
                <th className="px-1 font-medium">Custo</th>
              </tr>
            </thead>
            <tbody>
              {TIPOS_UNIDADE.map((t) => (
                <tr key={t} className="border-t border-couro/60">
                  <td className="whitespace-nowrap py-1 pr-2">
                    {UNIDADES_INFO[t].icone} {UNIDADES_INFO[t].nome}
                  </td>
                  <td className="px-1 tabular-nums">{B.unidades[t].ataque}</td>
                  <td className="px-1 tabular-nums">{B.unidades[t].defesa}</td>
                  <td className="px-1 tabular-nums">{B.unidades[t].carga}</td>
                  <td className="px-1">{custo(B.unidades[t].custo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <b>Triângulo de vantagens:</b> 🔱 lanceiro vence 🐎 cavalaria, 🐎 cavalaria vence 🏹 arqueiro, 🏹 arqueiro vence 🔱 lanceiro.
          Contra o tipo que vence, a unidade luta {B.batalha.multiplicadorVantagem}× melhor. Misture as tropas.
        </p>
        <p>
          Cada soldado come {B.unidades.lanceiro.consumoComidaHora} 🌾 por hora (a cavalaria, {B.unidades.cavalaria.consumoComidaHora}).
          Se a comida não sustentar o exército, {pct(B.desercaoHora)} do excedente deserta por hora.
        </p>
      </Secao>

      <Secao icone="🗺️" titulo="Mapa e territórios">
        <p>
          O mapa é dividido em territórios e regiões. Os neutros são guardados por <b>bárbaros</b>, mais fortes quanto mais longe das
          cidades. Você só ataca territórios <b>vizinhos</b> de um território seu que tenha tropas.
        </p>
        <ul className="space-y-1">
          {(Object.keys(TERRENOS_INFO) as (keyof typeof TERRENOS_INFO)[]).map((t) => (
            <li key={t}>
              {TERRENOS_INFO[t].icone} <b>{TERRENOS_INFO[t].nome}:</b> +{pct(B.mapa.bonusTerritorio)} de{' '}
              {RECURSOS_INFO[BONUS_DO_TERRENO[t]].nome.toLowerCase()} para o dono; {TERRENOS_INFO[t].efeito}
              {t === 'montanha' && ` (+${pct(B.batalha.bonusMontanha)})`}
              {t === 'floresta' && ` (+${pct(B.batalha.bonusFlorestaArqueiro)})`}.
            </li>
          ))}
        </ul>
        <p>
          As tropas marcham a {B.unidades.lanceiro.velocidade} léguas por hora (a cavalaria, {B.unidades.cavalaria.velocidade}; o grupo
          anda no passo do mais lento), e nenhuma marcha leva menos de {B.marcha.duracaoMinimaMin} minutos. Tropas em marcha continuam
          comendo.
        </p>
        <p>
          <b>Mover tropas:</b> no painel de um território seu, leve soldados para outro território seu, desde que haja um caminho só por
          territórios seus. Não tem batalha.
        </p>
      </Secao>

      <Secao icone="🚩" titulo="Ataques e batalhas">
        <p>
          <b>💰 Saque:</b> se vencer, leva até {pct(B.saque.maximoDoDesprotegido)} do estoque desprotegido de uma cidade, limitado à
          carga das tropas, e elas voltam para casa. <b>🚩 Conquista:</b> toma o território se a força de ataque for pelo menos{' '}
          <b>{num(B.batalha.margemConquista)}×</b> a da defesa. Vencendo sem essa folga, você só mata defensores e volta.
        </p>
        <p>
          A <b>cidade principal nunca é conquistada</b>, só saqueada. A Muralha dá +{pct(B.batalha.bonusMuralhaPorNivel)} de defesa por
          nível, mas só no território da cidade.
        </p>
        <p>
          Quem perde a batalha perde <b>{pct(B.batalha.perdaPerdedor)}</b> do exército. O vencedor perde menos quanto maior a vantagem.
          A sorte muda a força do atacante em no máximo <b>±{pct(B.batalha.sorteMaxima)}</b>: a estratégia decide. Os defensores que
          sobram num território conquistado recuam para a cidade do dono.
        </p>
      </Secao>

      <Secao icone="🔭" titulo="Reconhecimento">
        <p>
          No painel de um território vizinho, mande um <b>batedor</b> por {B.reconhecimento.custoOuro} 🪙. Quando ele volta, você vê as
          tropas que estavam lá, o terreno, a muralha e quantas unidades de cada tipo conquistam mesmo com o azar máximo. A informação é
          daquele momento: a defesa pode mudar depois.
        </p>
      </Secao>

      <Secao icone="🛡️" titulo="Proteções">
        <p>
          <b>Proteção de iniciante:</b> nas primeiras {B.protecoes.inicianteHoras} h da temporada ninguém ataca outro jogador. Os
          territórios neutros já podem ser atacados.
        </p>
        <p>
          <b>Escudo:</b> quem perde uma defesa para outro jogador fica {B.protecoes.escudoHoras} h sem poder ser atacado. Mas{' '}
          <b>atacar quebra o seu próprio escudo</b>, até um ataque contra bárbaros. O escudo é conferido quando a marcha sai.
        </p>
      </Secao>

      <Secao icone="🤝" titulo="Diplomacia">
        <p>
          Alianças, tréguas e traições são combinadas entre vocês, fora do jogo. Nenhum acordo é garantido pelas regras, e os objetivos
          são secretos até o fim: confie com cuidado. Alianças dentro do jogo chegam numa próxima fase.
        </p>
      </Secao>
    </div>
  );
}

function Secao({ icone, titulo, aberta, children }: { icone: string; titulo: string; aberta?: boolean; children: ReactNode }) {
  return (
    <details open={aberta} className="group rounded-xl border border-couro bg-carvao/90">
      <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-semibold [&::-webkit-details-marker]:hidden">
        <span className="text-xl" aria-hidden>
          {icone}
        </span>
        <span className="flex-1">{titulo}</span>
        <span className="text-pergaminho-escuro transition-transform group-open:rotate-180">▼</span>
      </summary>
      <div className="space-y-2 border-t border-couro px-4 pb-4 pt-3 text-sm leading-relaxed">{children}</div>
    </details>
  );
}
