# GDD — Terra de Ninguém

Oct 29, 2026 · @Yago

## Visão geral

Terra de Ninguém é um jogo de estratégia medieval e assíncrono em que cada jogador constrói sua cidade aos poucos e disputa territórios com os amigos em um mapa compartilhado. Junta a evolução de cidade de Social Empires com a conquista de territórios e a diplomacia de War.

- **Público:** grupo fechado de até 6 amigos, com entrada só por convite.
- **Plataforma:** navegador, com UI responsiva para desktop e celular (PWA instalável).
- **Ritmo:** cada um entra quando pode. A cidade produz mesmo com o jogador offline, e ataques podem chegar a qualquer momento.
- **Formato:** partidas em temporadas, com fim, vencedor e reset do mapa.

## Pilares de design

1. **Estratégia acima da sorte.** Composição do exército, terreno e informação decidem a batalha. A aleatoriedade fica em no máximo ±10% do resultado.
2. **Tensão sem frustração.** Ataques surpresa existem, mas ninguém perde tudo de uma vez.
3. **Escolhas com custo.** Cada habitante é trabalhador ou soldado, nunca os dois. Crescer e atacar competem pelos mesmos recursos.
4. **A diplomacia é o jogo.** Alianças, pactos e traições entre amigos são o centro da diversão.
5. **Sessões curtas.** Uma visita de 5 a 10 minutos já rende progresso.

## Loop principal

&#91;embedded content: loop principal · 4 etapas\]

A cidade produz em tempo real, mesmo com o jogador offline. Uma visita típica: coletar o que foi produzido, iniciar uma construção, treinar tropas e mandar um ataque. O resultado chega horas depois, num relatório.

## Recursos e população

São quatro recursos. A população é o recurso central, porque todo habitante precisa escolher entre produzir e lutar.

| Recurso | Como é gerado | Para que serve |
| --- | --- | --- |
| População | Casas, até um limite por nível | Vira trabalhador (produz) ou soldado (luta) |
| Comida | Fazendas, com trabalhadores alocados | Treinar e manter tropas; crescimento da população |
| Madeira | Serraria, com trabalhadores alocados | Construir e evoluir prédios |
| Ouro | Mercado e saque de inimigos | Unidades avançadas, evoluções e diplomacia |

- A produção depende de quantos trabalhadores estão alocados. Um exército grande deixa a economia fraca.
- Tropas consomem comida continuamente. Se a comida acabar, as tropas desertam aos poucos.
- O armazém define quanto você guarda e protege uma parte contra saques.
- Os valores exatos de produção e custo ficam para a fase de balanceamento.

## Cidade e prédios

A cidade começa com Centro da Cidade nível 1, e ele limita o nível máximo de todos os outros prédios. Construir e evoluir leva tempo real e custa recursos. No MVP, só uma construção acontece por vez.

| Prédio | Função | No MVP? |
| --- | --- | --- |
| Centro da Cidade | Desbloqueia prédios e define o nível máximo | Sim |
| Casa | Aumenta o limite de população | Sim |
| Fazenda | Produz comida | Sim |
| Serraria | Produz madeira | Sim |
| Mercado | Produz ouro; depois, troca entre recursos | Sim |
| Armazém | Capacidade de estoque e proteção contra saque | Sim |
| Quartel | Treina unidades | Sim |
| Muralha | Bônus de defesa da cidade | Sim |
| Torre de vigia | Revela ataques chegando | Fase 2 |
| Embaixada | Permite criar e entrar em alianças | Fase 2 |

## Unidades e combate

O combate segue um triângulo de vantagens: lanceiro vence cavalaria, cavalaria vence arqueiro, arqueiro vence lanceiro. Contra o tipo que ela vence, uma unidade causa o dobro de dano.

| Unidade | Vence | Perde para | Perfil |
| --- | --- | --- | --- |
| Lanceiro | Cavalaria | Arqueiro | Barato, bom na defesa |
| Arqueiro | Lanceiro | Cavalaria | Dano alto, vida baixa |
| Cavalaria | Arqueiro | Lanceiro | Rápida, cara, boa no ataque e no saque |

Cada unidade ocupa 1 de população e consome comida. Na fase 4 entram unidades de cerco (contra muralhas) e heróis.

**Resolução da batalha** (automática, no servidor, quando a marcha chega):

1. Calcula a força de cada lado, aplicando o triângulo de vantagens.
2. Aplica os modificadores: muralha, terreno e variação aleatória de ±10%.
3. Distribui as perdas proporcionalmente à diferença de força.
4. Se o atacante vencer, saqueia ou conquista o alvo.
5. Gera um relatório de batalha para os dois lados.

## Mapa e territórios

O mapa é dividido em territórios ligados por fronteiras, como no War. Um mapa novo é gerado a cada temporada, então ninguém decora as melhores posições. Cada jogador começa com sua cidade num território próprio, e só é possível atacar territórios vizinhos aos seus.

- **Territórios neutros** começam guardados por tropas bárbaras e servem para expansão no início da temporada.
- **Bônus por território:** cada um dá um bônus de produção (+comida, +madeira ou +ouro).
- **Terreno:** planície (neutro), floresta (bônus para arqueiros na defesa) e montanha (bônus de defesa geral).
- **Distância:** o tempo de marcha depende da distância e da unidade mais lenta do exército.
- **Tamanho:** Até 6 jogadores, com cerca de 4 a 5 territórios por jogador (24 a 30 no total).

## Ataques, defesa e proteções

Ataques podem chegar sem aviso a qualquer hora. Três proteções evitam que alguém entre no jogo e encontre a cidade destruída.

**Tipos de ataque**

- **Saque:** rouba recursos sem tomar o território.
- **Conquista:** toma um território que não seja a cidade principal. Exige vencer a batalha com margem.

**Proteções**

- **Ninguém perde tudo:** o saque leva no máximo 30% do estoque desprotegido, e o armazém guarda uma parte fora do alcance.
- **Escudo pós-derrota:** depois de um ataque pesado, a cidade fica protegida por algumas horas.
- **Proteção de iniciante:** nas primeiras 48 horas da temporada, ninguém ataca jogadores.
- **Cidade principal nunca é eliminada:** pode ser saqueada, mas não conquistada.

**Informação**

- Sem torre de vigia, o defensor só descobre o ataque no relatório.
- Com torre de vigia, ele vê exércitos chegando e pode reforçar a defesa ou pedir ajuda a um aliado. Níveis mais altos revelam o tamanho e a composição do exército.
- Notificações no celular avisam do ataque, se o jogador tiver torre.

## Diplomacia e alianças

As relações são formais no sistema, mas trair continua sendo possível, e isso tem custo.

- **Aliança:** até 3 jogadores. Os membros veem os ataques recebidos uns dos outros, enviam tropas de reforço e trocam recursos.
- **Pacto de não agressão:** acordo entre dois jogadores, com prazo definido.
- **Traição:** romper uma aliança ou pacto leva 12 horas para valer, e todos os jogadores recebem um aviso público.
- **Chat:** um canal geral e um canal privado por aliança.

## Temporadas e condições de vitória

Cada temporada dura de 2 a 4 semanas. No início, cada jogador sorteia um objetivo secreto, como no War, e vence quem cumprir o seu primeiro, revelando a carta para todos. Depois, o mapa e as cidades resetam.

O gerador de mapa divide os territórios em 5 ou 6 regiões, o equivalente aos continentes do War. Os objetivos possíveis:

| Objetivo secreto | Origem | Exemplo |
| --- | --- | --- |
| Dominar duas regiões específicas | War (continentes) | Conquiste a Floresta do Norte e as Montanhas de Ferro |
| Dominar mais da metade do mapa | War (24 territórios) | Cerca de 55% dos territórios |
| Dominar territórios bem defendidos | War (18 territórios com 2 exércitos) | 12 territórios com guarnição mínima em cada |
| Derrubar um rival específico | War (destruir um exército) | Reduza o jogador X a apenas sua cidade principal. Se outro fizer isso antes, o objetivo vira dominar mais da metade do mapa |
| Alcançar população X | Próprio do jogo | Vitória econômica, para quem prefere crescer a guerrear |

Se ninguém cumprir o objetivo no prazo, vence quem tiver mais pontos (territórios + população + batalhas vencidas). Os números exatos de cada objetivo ficam para o balanceamento. Um ranking histórico guarda os vencedores de cada temporada.

## Plataforma e arquitetura técnica

&#91;embedded content: arquitetura · cliente + Supabase\]

Como o jogo é assíncrono, a produção é calculada por tempo decorrido quando o jogador abre o jogo, e as batalhas se resolvem quando a marcha chega. Nada precisa ficar rodando o tempo todo, então tudo cabe em planos gratuitos.

- **Por que não Unity:** o Claude escreve a maior parte do código, e uma stack 100% em texto funciona melhor que um projeto que depende do editor (cenas, prefabs, inspector).
- **Servidor autoritativo:** todo cálculo de batalha, produção e custo acontece no servidor. O cliente só mostra e envia comandos.
- **UI responsiva:** a mesma interface serve desktop e celular. Como PWA, pode ser instalada na tela inicial e receber notificações.
- **Limites do plano gratuito do Supabase:** 500 MB de banco, 50 mil usuários ativos por mês e até 2 projetos ativos. Projetos sem atividade por 7 dias são pausados ([fonte](https://makerkit.dev/blog/saas/supabase-pricing)).

## Escopo do MVP e roadmap

O MVP precisa provar uma coisa: que o grupo volta ao jogo todo dia para construir e atacar. Todo o resto vem depois.

1. **MVP:** login por convite, mapa com territórios, cidade com os 8 prédios marcados acima, 3 unidades, ataque de saque e conquista, relatório de batalha, proteções básicas.
2. **Fase 2 — social:** alianças, pactos, chat, torre de vigia e notificações.
3. **Fase 3 — temporadas:** condições de vitória, reset do mapa e ranking histórico.
4. **Fase 4 — polimento:** arte final, sons, unidades de cerco, heróis e eventos.

## Questões em aberto

- [ ] Nome: definido, Terra de Ninguém. Tema: definido, medieval.
- [ ] Condições de vitória: definidas, objetivos secretos. Falta a duração exata da temporada e os números de cada objetivo
- [ ] Número de jogadores: definido, máximo de 6
- [ ] Mapa: definido, gerado a cada temporada. Falta decidir as regras de geração (equilíbrio entre posições iniciais)
- [ ] Valores de produção, custos e tempos (balanceamento)
- [ ] Estilo de arte do MVP: formas simples, assets gratuitos ou arte própria
