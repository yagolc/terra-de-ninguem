import {
  BALANCEAMENTO,
  BONUS_DO_TERRENO,
  TIPOS_ESPECIALIDADE,
  TIPOS_ESTRUTURA,
  TIPOS_RACA,
  TIPOS_UNIDADE,
  capacidadeArmazem,
  custoTreinoHeroi,
  limitePopulacao,
  protecaoArmazem,
  quantasCidadesLivres,
} from '@terra/regras';
import { useState, type ReactNode } from 'react';
import Cronica from '../componentes/Cronica';
import { CRONICAS } from '../lib/cronicas';
import { ESPECIALIDADES_INFO, ESTRUTURAS_INFO, PREDIOS, RACAS_INFO, RECURSOS_INFO, TERRENOS_INFO, TITULO_HERDEIRO, UNIDADES_INFO } from '../lib/textos';

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

      <Cronicas />

      <Secao icone="🎯" titulo="O objetivo" aberta>
        <p>
          Cada temporada dura <b>{B.temporada.duracaoDias} dias</b>. Ao entrar, você recebe um <b>objetivo secreto</b> (aba Objetivo). Quem
          cumprir o seu precisa <b>mantê-lo por {B.objetivos.segurarHoras} h seguidas</b> para vencer. Nesse tempo, todos veem no mapa
          quem cumpriu e quanto falta (o objetivo continua secreto), e ele fica <b>sem escudo e sem pactos de não agressão</b> (os que
          tinha acabam, e não dá para fechar outro): é a chance dos outros de reagir. Se deixar de cumprir, o relógio zera. Quando alguém vence, todas as cartas são reveladas.
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
          O Armazém guarda {num(capacidadeArmazem(0))} de cada recurso sem nível, e cada nível aumenta isso em{' '}
          {Math.round((B.armazem.crescimentoCapacidade - 1) * 100)}% (no nível {B.predios.armazem.nivelMaximo}, guarda{' '}
          {num(capacidadeArmazem(B.predios.armazem.nivelMaximo))}). Uma obra que custa mais do que ele guarda pede um Armazém maior. Ele
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
          territórios seus. Não tem batalha, a não ser que o destino seja tomado enquanto as tropas andam: aí, ao chegar, elas lutam para
          retomá-lo, como numa conquista (precisa de 1,5× a defesa). Isso não quebra o seu escudo.
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

      <Secao icone="🏗️" titulo="Estruturas nos territórios">
        <p>
          No painel de um território seu (a cidade também conta), construa <b>uma estrutura</b>. Elas não usam a fila de obras da
          cidade. <b>Se o território for conquistado, a estrutura é destruída.</b> Você também pode <b>destruir a sua</b> (nada do que
          ela custou volta) para construir outra no lugar.
        </p>
        <ul className="space-y-1">
          {TIPOS_ESTRUTURA.map((t) => (
            <li key={t}>
              {ESTRUTURAS_INFO[t].icone} <b>{ESTRUTURAS_INFO[t].nome}</b> ({custo(B.estruturas[t].custo)}, {B.estruturas[t].tempoMin} min):{' '}
              {ESTRUTURAS_INFO[t].descricao}
            </li>
          ))}
        </ul>
        <p>
          ⛺ O <b>acampamento militar</b> só vai em território conquistado (nunca na cidade) e cada jogador tem no máximo{' '}
          {B.acampamento.maximoPorJogador}. Com ele pronto, o Quartel da cidade escolhe onde o lote fica pronto: na cidade ou no
          acampamento, já na frente de batalha. Custo, fila e população são os de sempre (os soldados saem da cidade). Se o acampamento
          cair ou for destruído, os lotes que ficariam prontos nele ficam prontos na cidade.
        </p>
        <p>
          <b>As estruturas dos outros são secretas:</b> no mapa aparece só um ❓. Para saber qual é (e se já está pronta),
          mande um batedor. A torre não mostra de que tipo são os soldados: para isso, também é preciso um batedor. Quando ela avista alguém, a aba Mapa
          ganha um aviso ⚠️ vermelho.
        </p>
        <p>
          🛤️ <b>Estrada</b> ({custo(B.estrada.custo)}, {B.estrada.tempoMin} min): fica à parte, então um território pode ter uma estrada e
          uma estrutura. Tropas que você <b>move entre dois territórios seus com estrada pronta</b> andam{' '}
          <b>{B.estrada.multiplicadorVelocidade}× mais rápido</b>, para reforçar antes de um ataque chegar. Ataques não usam estrada.
          Estradas não são secretas: todos as veem no mapa. Também são destruídas na conquista.
        </p>
      </Secao>

      <Secao icone="🧝" titulo="Raças">
        <p>
          Ao fundar a cidade, cada jogador escolhe a raça do seu povo. Ela vale a temporada toda (na próxima, escolhe de novo) e todos
          veem a raça dos outros no mapa e no placar. Os bônus da raça somam com os do herói.
        </p>
        <ul className="space-y-1">
          {TIPOS_RACA.map((r) => (
            <li key={r}>
              {RACAS_INFO[r].icone} <b>{RACAS_INFO[r].nome}:</b> {RACAS_INFO[r].vantagem} <span className="text-pergaminho-escuro">{RACAS_INFO[r].desvantagem}</span>
            </li>
          ))}
        </ul>
        <p>
          O objetivo secreto <b>⚔️ Velha rixa</b> pede {B.objetivos.rixaTerritorios} territórios diferentes conquistados de jogadores de
          uma raça (cada território conta uma vez só), ou deixar todos eles só com a cidade principal. A raça é sempre a de um vizinho,
          com a cidade a até {B.objetivos.rixaDistanciaMaxima} fronteiras da sua. Já o objetivo de <b>duas regiões</b> sempre inclui a
          região da sua cidade e uma vizinha dela que comece a pelo menos {B.objetivos.vizinhaDistanciaMinima} fronteiras da cidade
          e tenha a cidade de outro jogador.
        </p>
      </Secao>

      <Secao icone="👑" titulo="O herdeiro do trono">
        <p>
          Quem venceu a temporada anterior entra como <b>{TITULO_HERDEIRO}</b>, com coroa na bandeira. A cidade dele começa com a{' '}
          <b>Guarda Real</b>: {B.herdeiro.guardaReal} lanceiros que defendem a cidade sem ocupar população nem comer, não marcham e não
          voltam se morrerem.
        </p>
        <p>
          Em troca, ele tem a <b>cabeça a prêmio</b>: cada batalha vencida contra o herdeiro (atacando ou defendendo) vale{' '}
          <b>+{B.herdeiro.pontosPorVitoria} pontos</b> a mais no placar.
        </p>
      </Secao>

      <Secao icone="🎖️" titulo="Herói">
        <p>
          Com o Quartel construído, recrute <b>um herói</b> por temporada ({custo(B.herois.custoRecrutar)}): você escolhe o nome e a
          especialidade, que não muda depois. Ele ocupa 1 de população, não come e <b>nunca morre</b>.
        </p>
        <ul className="space-y-1">
          {TIPOS_ESPECIALIDADE.map((e) => (
            <li key={e}>
              {ESPECIALIDADES_INFO[e].icone} <b>{ESPECIALIDADES_INFO[e].nome}:</b> {ESPECIALIDADES_INFO[e].descricao} +
              {pct(B.herois.bonusPorNivel[e])} por nível, até {pct(B.herois.bonusPorNivel[e] * B.herois.nivelMaximo)}.
            </li>
          ))}
        </ul>
        <p>
          O intendente rende sempre, mesmo parado na cidade; os outros só ajudam na marcha ou no território e arriscam ferimento, por
          isso dão mais por nível. Para subir até o nível {B.herois.nivelMaximo}, ele treina pagando ouro (do nível 2 por {num(custoTreinoHeroi(2).ouro)} 🪙 ao nível{' '}
          {B.herois.nivelMaximo} por {num(custoTreinoHeroi(B.herois.nivelMaximo).ouro)} 🪙), em qualquer território onde estiver parado, menos
          em marcha; enquanto treina, fica ocupado.
        </p>
        <p>
          Para levá-lo numa marcha, marque a opção ao mandar tropas do território onde ele está (ele nunca vai sozinho). Se o exército dele
          perder, ou se o território onde ele está perder uma defesa, ele fica <b>ferido por {B.herois.feridoHoras} h</b> e volta para a
          cidade. Ninguém sabe onde está o seu herói, a não ser que mande um batedor.
        </p>
      </Secao>

      <Secao icone="🏘️" titulo="Vilas e cidades livres">
        <p>
          Alguns territórios têm um povoado. Quem é dono do território é dono do povoado. Tomado de outro jogador, ele só passa a dar
          bônus depois de <b>{B.povoados.lealdadeHoras} h de lealdade</b> (neutro, dá na hora).
        </p>
        <p>
          🏘️ <b>Vila.</b> Neutra, tem um estoque ({custo(B.povoados.vila.estoque)}) que um <b>saque</b> leva inteiro, até a carga das tropas.
          Depois ela volta a encher em {B.povoados.vila.horasParaEncher} h. Conquistada, vira sua no nível 1 e dá{' '}
          <b>+{B.povoados.vila.populacaoPorNivel} de população máxima por nível</b> (até o nível {B.povoados.vila.nivelMaximo}; melhorar custa{' '}
          {custo(B.povoados.vila.custoPorNivel)} vezes o nível). Se outro jogador saquear a sua vila, ela <b>volta ao nível 0</b> e ele leva
          parte do que foi investido.
        </p>
        <p>
          ⚖️ <b>Cidade livre.</b> Há {quantasCidadesLivres(6)} no meio do mapa ({quantasCidadesLivres(8)} com 7 ou 8 jogadores), com guarda forte e muralha própria (+
          {pct(B.povoados.cidadeLivre.bonusDefesa)} de defesa, que depois protege o dono também). Dá{' '}
          <b>+{B.povoados.cidadeLivre.ouroHora} de ouro por hora</b>. Na primeira conquista, {B.povoados.cidadeLivre.milicia}{' '}
          lanceiros de milícia passam a defendê-la para quem conquistou: não ocupam população, não comem e não marcham, e se dispersam
          se a cidade for tomada. Quem tiver todas por {B.objetivos.monopolioHoras} h seguidas faz o{' '}
          <b>monopólio comercial e vence a temporada</b>. Vale para todos, e o relógio aparece no mapa para todo mundo: tome uma
          delas e ele zera.
        </p>
      </Secao>

      <Secao icone="☠️" titulo="Hordas bárbaras">
        <p>
          Depois da proteção de iniciante, a cada {B.hordas.intervaloHoras} h uma <b>horda bárbara</b> sai da borda do mapa contra um
          território (a cidade também pode ser o alvo) de um dos {B.hordas.primeirosDoPlacar} primeiros do placar. Todos a veem chegando{' '}
          <b>{B.hordas.avisoHoras} h antes</b>, com a seta no mapa e o aviso no alto: dá tempo de mandar reforço ou pedir ajuda.
        </p>
        <p>
          A primeira tem uns {B.hordas.unidadesBase} soldados e cada nova vem com {B.hordas.unidadesPorHorda} a mais. Quem defende ganha ouro (
          {B.hordas.ouroBase} na primeira, {B.hordas.ouroPorHorda} a mais a cada horda). Se a horda vencer na <b>cidade</b>, saqueia e vai
          embora; num <b>território comum</b>, com força para conquistar, ele vira neutro, com os bárbaros de guarda, e qualquer um pode
          tomá-lo.
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

      <Secao icone="🕊️" titulo="Pombos e pactos">
        <p>
          O <b>{PREDIOS.pombal.nome}</b> ({custo(B.predios.pombal.custoBase)} no nível 1, até o nível {B.predios.pombal.nivelMaximo}) solta
          pombos-correio que levam cartas até a cidade de outro jogador, na aba <b>Cartas</b>. O pombo voa {B.pombos.velocidade} léguas
          por hora no nível 1 (+{pct(B.pombos.bonusVelocidadePorNivel)} por nível), então quanto mais longe, mais a carta demora. Cada
          nível dá {B.pombos.pombosPorNivel} pombos, e cada carta ainda voando ocupa um. Só quem manda e quem recebe leem a carta.
        </p>
        <p>
          Uma carta pode levar uma proposta de <b>pacto de não agressão</b> de {B.pombos.pacto.horasMinimas} a{' '}
          {B.pombos.pacto.horasMaximas} horas. Quem recebe tem {B.pombos.pacto.validadePropostaHoras} h para aceitar ou recusar (não
          precisa de Pombal para responder). Aceito, o pacto vale na hora: nenhum dos dois consegue mandar ataque contra o outro, e as
          marchas que já estavam a caminho voltam sem lutar. Reconhecimento continua liberado. Os pactos são secretos: os outros
          jogadores não sabem quem fez pacto com quem.
        </p>
        <p>
          A carta também pode propor <b>acesso militar</b>, com as mesmas horas e o mesmo prazo para responder. Aceito, as tropas de
          cada um atravessam as terras do outro: para mover tropas entre seus territórios e para atacar ou mandar batedor a um
          território que faz fronteira com as terras dele, mesmo longe das suas. A marcha leva o tempo da distância toda. As tropas
          não param lá nem ajudam a defender, e o corredor nunca serve para atacar o próprio dono das terras. Marchas que já saíram
          seguem mesmo se o acesso acabar. Também é secreto e não se rompe, e não impede ataques entre os dois: para isso, combine
          também um pacto de não agressão.
        </p>
      </Secao>

      <Secao icone="🤝" titulo="Diplomacia">
        <p>
          Alianças e traições são combinadas entre vocês. Fora o pacto de não agressão e o acesso militar, nenhum acordo é garantido
          pelas regras, e os objetivos são secretos até o fim: confie com cuidado.
        </p>
      </Secao>
    </div>
  );
}

function Cronicas() {
  const temporadas = Object.keys(CRONICAS)
    .map(Number)
    .sort((a, b) => a - b);
  const [lendo, setLendo] = useState(false);
  const ultima = temporadas.at(-1);
  return (
    <Secao icone="📜" titulo="Crônicas do Reino">
      {ultima !== undefined && (
        <button
          onClick={() => setLendo(true)}
          className="rounded-lg border border-ouro/60 px-3 py-1.5 text-sm font-semibold text-ouro hover:bg-ouro/10"
        >
          📖 Ler como livro, do começo ao fim
        </button>
      )}
      {lendo && ultima !== undefined && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-noite/95">
          <Cronica temporada={ultima} inicio={temporadas[0]} concluir="Fechar" onConcluir={() => setLendo(false)} />
        </div>
      )}
      {temporadas.map((n) => (
        <div key={n} className="space-y-2">
          <h3 className="font-titulo text-ouro">
            Temporada {n}: {CRONICAS[n]!.titulo}
          </h3>
          {CRONICAS[n]!.paginas.map((p) => (
            <p key={p.titulo}>
              <b>{p.titulo}.</b> {p.texto}
            </p>
          ))}
        </div>
      ))}
    </Secao>
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
