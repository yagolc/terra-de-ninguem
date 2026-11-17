# Pendências para a temporada 6

Mudanças combinadas durante a temporada 5 (Épico 8, playtest), para entrar **antes** de rodar o `temporada:nova` da
temporada 6. Mexem no equilíbrio, por isso não entram no meio de uma temporada. Ao fazer cada uma, mova-a para
`docs/novidades.md` (seção da temporada 6) e apague daqui.

Já feito para a temporada 6 (está no código, liga sozinho): todo objetivo exige o Centro da Cidade 10, e o Senhor da
guerra pede 35 vitórias e o Quartel 10.

## 1. Soldo em ouro (economia)

**Problema (17/11/2026):** manter exército sai de graça. Um fazendeiro alimenta de 12 lanceiros (Fazenda 1) a 23
(Fazenda 10); com a Casa 10 (110 habitantes), 5 fazendeiros sustentam 105 soldados, 95% da população. O lanceiro
custa 30 de comida e 20 de madeira, treina em 1 minuto e não custa ouro. O único limite real é a população, e quem
sobe Casa e pega vilas primeiro vira bola de neve (o maior exército da temporada 5 era legítimo, dentro das regras).

**Proposta:** cada soldado custa ouro por hora, em `BALANCEAMENTO.unidades.<tipo>.soldoOuroHora`: **lanceiro e
arqueiro 0,3, cavalaria 0,6** (não 0,5: ver a conta abaixo). Sem ouro, desertam como já acontece sem comida
(`atualizarCidade`). Exército grande passa a exigir gente no Mercado ou acordos comerciais (item 6): volta a valer o
pilar "cada habitante é trabalhador ou soldado". Conferir com o simulador e um teste de quantos soldados uma cidade
típica sustenta.

**Conta (cidade média da temporada 5: 194 comida, 204 madeira, 71 ouro por hora; 55 soldados):** o Centro do 2 ao 10
custa 11.233 de ouro, e todo objetivo da 6 exige o Centro 10. Sem soldo, são 158 h de ouro; com soldo 0,3, 206 h
(23% do ouro vai para o soldo); com 0,5, 258 h (39%), apertado demais para uma temporada de 3 semanas. O pacote abaixo
(câmbio e acordos comerciais) devolve ouro a quem negocia, sem aumentar a produção de todos.

## 2. Reforço aliado (diplomacia)

**Problema:** 1 contra 2 é quase impossível. No simulador, exércitos iguais (80 × 80) deixam o defensor com cerca de
24 soldados; o segundo inimigo chega com 80 frescos e vence e conquista em 100% das vezes, perdendo 15%. O escudo de
8 h só barra marchas novas.

**Proposta:** com **acesso militar** aceito, mandar tropas para **defender um território do aliado**; elas lutam junto
com as dele na defesa (somadas em `resolverBatalha`, perdas divididas na proporção) e voltam depois. O 1 contra 2 vira
2 contra 2, no espírito de "a diplomacia é o jogo".

## 3. Milícia local (território vazio não é de graça)

**Problema (17/11/2026, temporada 5):** dos 56 territórios tomados de jogadores, 33 (59%) não tinham nenhum
defensor (ataque médio de 13 soldados); 32 dos 44 territórios de jogador fora das cidades estavam vazios. Com uns 6
territórios e um exército médio de 55, espalhar dá uns 9 por território, menos que um ataque comum (19); concentrar
deixa o resto de graça. Não há meio-termo.

**Proposta:** todo território de jogador (menos a cidade principal, que já tem muralha) tem uma **milícia local** que
**não sai da população**: começa com 3 lanceiros e ganha +1 a cada 6 h de posse, até 8 (números em
`BALANCEAMENTO.miliciaLocal`, pela posse do território). Defende junto com as tropas do dono, como a milícia da
cidade livre (`povoados.milicia`, migration 0014) e a Guarda Real; as perdas dela baixam o contador, e ela some na
conquista (o novo dono recomeça do 3). O batedor e `analisarDefesa` contam a milícia. Precisa de coluna nova
(`territorios.milicia_local`, `posse_desde` do território) e de teste com `geradorComSemente` para os limites de perda.
Efeito esperado: tomar um território "vazio" pede um ataque de verdade (uns 10 soldados), sem impedir a guerra.

## 4. Cerco (rede de segurança)

**Proposta:** quem é atacado por 2 ou mais jogadores diferentes em 12 h fica **"⚔️ sitiado"**: +20% de defesa por 12 h,
visível para todos no mapa. Não impede a guerra; só tira a vantagem de bater junto num só. Números em
`BALANCEAMENTO.cerco`.

## 5. Pacote de economia: a comida ganha função e o ouro vem de negociar

**Problema (17/11/2026, temporada 5, cidade média):** sobram **+154 de comida por hora** depois de alimentar as tropas;
a comida quase não tem uso depois do treino. O ouro é o gargalo (71/h, e mais ainda com o soldo e o Centro 10). Não há
nenhum jeito de passar recursos de um jogador para outro. Ideia geral: **não aumentar a produção de todos**; dar uso à
sobra e fazer o ouro extra vir da diplomacia.

### 5a. Acordo comercial (fonte principal de ouro a mais)

Nova proposta por carta, como o pacto de não agressão e o acesso militar (`cartas.proposta = 'acordo_comercial'`,
`pacto_ate`): enquanto vale, **os dois ganham ouro a mais** — por exemplo +15% da produção de ouro de cada um, ou uma
renda fixa que cresce com a distância entre as cidades (rota longa rende mais, como rota comercial). Limite de acordos
ao mesmo tempo (ex.: 2) para não virar todo mundo com todo mundo. **Acaba na hora se um atacar o outro**: quem rompe
perde a renda e o outro fica sabendo (dá peso a manter a paz). **Público** (decidido em 17/11/2026): todos veem quem tem acordo com quem (no mapa e no perfil); a rota já deixaria
isso dedutível, e saber quem negocia com quem vira informação para a diplomacia. Diferente dos pactos de não agressão
e do acesso militar, que continuam secretos. Números em `BALANCEAMENTO.comercio`.

**Rota sem interrupção (pedido do usuário, 17/11/2026):** só dá para propor e aceitar o acordo se houver uma **rota
entre as duas cidades** passando só por territórios dos dois parceiros (de um ou de outro), sem atravessar terra de
terceiros, neutros ou bárbaros, nem rio ou cordilheira (as barreiras já ficam fora de `fronteiras`). Dá para reusar
`ligadosPorTerritoriosProprios` com os territórios do parceiro como corredor, como o acesso militar faz em
`terrasParaMarchar`. Se durante o acordo alguém conquistar um pedaço do caminho e cortar a rota, **a renda para**
enquanto a rota estiver cortada e volta quando for reconectada (o acordo não acaba; acaba só com ataque entre os
dois ou no fim do prazo). Isso dá um motivo para os inimigos mirarem as terras do meio, e para os parceiros as
defenderem. O mapa desenha a rota ativa (o acordo é público). **Território neutro ou bárbaro no caminho também interrompe**
(decidido em 17/11/2026): os parceiros precisam se expandir um em direção ao outro.

### 5b. Câmbio no Mercado

Trocar um recurso por outro no Mercado com perda: **3 por 1** no nível 1, melhorando com o nível (ex.: 2 por 1 no 10).
A sobra de comida da cidade média (cerca de 106/h com 5c) vira uns **+36 de ouro por hora** a 3 por 1 — mais do que o
soldo de 55 soldados a 0,3 (17/h). Resolve quem fica travado por falta de um recurso.

### 5c. A população come

Cada habitante (trabalhador ou soldado) come 0,5 de comida por hora. Na cidade média, +48/h de gasto: a sobra cai de
+154 para cerca de +106/h, sem precisar de mais produção. Cidade grande pede fazenda grande, e saque de comida passa a
doer. Entra em `atualizarCidade` (o consumo já existe para as tropas) e na deserção/fome.

### 5d. Caravanas

Mandar recursos a outro jogador por uma caravana que viaja pelo mapa como uma marcha, com taxa de 10%. Serve para
tributo, comprar paz, ajudar aliado e pagar resgate de pet, combinados por carta. Extra (opcional): caravana pode ser
interceptada por quem está em guerra com quem manda.

### 5e. Terras que valem a pena

O bônus de recurso de um território é só 10% (`mapa.bonusTerritorio`): pouco para justificar uma guerra por ele.
Subir para 20–25% e/ou ter algumas terras especiais por região (mina de ouro, celeiro), para disputar lugares
específicos do mapa.

## 6. Ordens por pombo (mudar a marcha no caminho)

**Ideia do usuário (17/11/2026):** usar o pombo para mandar ordens a um exército que já está marchando, dando ao
Pombal um papel militar. Hoje uma marcha enviada não volta nem muda de rumo.

**Como funcionaria:**
- **Ordens:** *recuar* (o exército volta para onde saiu) e *redirecionar* (novo alvo: um território vizinho do destino
  original, ou outro que ele alcance pelas regras de ataque). Proposta para valorizar o Pombal: recuar a partir do
  Pombal 1, redirecionar a partir do Pombal 3.
- **O pombo precisa alcançar o exército:** sai da cidade do jogador e persegue a marcha. Velocidades atuais: pombo 60
  léguas/h no Pombal 1 até 120 no 5; exército a pé 20, cavalaria 40. Perseguindo cavalaria, o pombo do Pombal 1 leva
  4 vezes mais que o do 5 para alcançar. Se a marcha chegar antes do pombo, **a ordem se perde** e a batalha acontece
  (o jogador recebe "o pombo chegou tarde").
- **Usa um pombo** do Pombal (`pombosDoPombal`) até entregar a ordem, como uma carta.
- **Depois da ordem:** o ponto onde o exército estava vira a nova partida; a chegada nova é a distância até o alvo
  novo dividida pela velocidade do exército. Vale também para marchas de movimento.
- **Estratégia e blefe:** a torre do alvo original deixa de ver a marcha desviada, e a do alvo novo passa a ver.
  Dá para fingir um ataque num lugar e virar para outro, com o risco de o pombo não chegar a tempo.
- **Implementação:** regra pura de encontro (`encontroDoPombo`: instante em que a distância da cidade até a posição da
  marcha é igual à que o pombo voou) e posição da marcha no tempo (linha reta entre os centros); colunas novas em
  `marchas` para a partida no meio do caminho (`partida_x`, `partida_y`) e para a ordem a caminho; o
  `resolver-marchas` aplica a ordem quando o pombo chega. O mapa desenha o pombo voando até o exército.

## 7. Exército: teto pelo Quartel e qualidade das tropas

**Ideia do usuário (17/11/2026):** o tamanho do exército passa a ser limitado pelo Quartel, e as tropas têm qualidade:
recrutas baratíssimos e fracos, elites caras e muito mais fortes. Junto com o soldo (item 1), o jogador escolhe entre
muitos e baratos ou poucos e fortes.

**Teto pelo Quartel: 24 + 6 vagas de soldado por nível** (Q1 30, Q2 36, Q3 42, Q5 54, Q7 66, Q10 84), em
`BALANCEAMENTO.quartel.vagasBase`/`vagasPorNivel`. O limite é o **menor** entre o Quartel e a população: os soldados
continuam sendo habitantes (pilar "cada habitante é trabalhador ou soldado"). Com a Casa 10 (110) sobram pelo menos 26
trabalhando, o que resolve os "95% no exército". Milícia local, milícia de cidade livre e Guarda Real não ocupam
vaga. Contam as tropas paradas, em marcha e em treino.

Por que não só 8 por nível: no Q1 seriam 8 vagas, e conquistar o vizinho bárbaro típico (8 na planície) pede, mesmo
com azar máximo, 17 lanceiros, 10 arqueiros ou 11 cavalarias (`analisarDefesa`); a 2 fronteiras (14) pede 29/18/18,
na montanha 36/22/22. Guarnições da temporada 5: a maioria de 5 a 10, depois 13 a 23, algumas de 45 a 78. Com a base
de 24, o Q1 conquista o vizinho até só com recrutas (cerca de 28 recrutas lanceiros). A outra opção (20 + 8 por nível)
daria 100 vagas no Q10, perto da população inteira.

**Qualidades** (multiplicam ataque e defesa de cada unidade; números em `BALANCEAMENTO.qualidades`):

| | Força | Soldo (ouro/h, lanceiro) | Treino (lanceiro) | Exige |
| --- | --- | --- | --- | --- |
| Recruta | ×0,6 | 0,03 (quase nada) | 12 comida, 8 madeira, 20 s | Quartel 1 |
| Soldado (o de hoje) | ×1 | 0,3 | 30 comida, 20 madeira, 60 s | Quartel 1 |
| Elite | ×2,5 | 1,2 | 120 comida, 80 madeira, 60 ouro, 4 min | Quartel 7 |

Eficiência: força por vaga 0,6 / 1 / 2,5; força por ouro de soldo 20 / 3,3 / 2,1. Melhor mistura (força máxima com as
vagas e o ouro do soldo): Q3 com 5 de ouro/h → 15 soldados + 9 recrutas (20); Q5 com 10/h → 32 soldados + 8 recrutas
(37); Q7 com 20/h → 14 elites + 7 soldados + 35 recrutas (63); Q10 com 20/h → 15 elites + 65 recrutas (77); com 40/h →
32 elites + 48 recrutas (109); com 80/h → 66 elites + 13 recrutas (174). No fim de jogo a força depende do ouro: dá
peso à economia e aos acordos comerciais (item 5a).

**Cuidados:** jogador rico pode disparar (freios: soldo alto da elite, perder 70% de elite na derrota custa muito ouro,
rota comercial que pode ser cortada, cerco); simular antes de fixar o ×2,5. O soldado normal some no fim (elite +
recruta é sempre melhor); dá para dar a ele uma vantagem depois (treino mais rápido). É a mudança mais trabalhosa da
lista: tropas, marchas, fila de treino, relatórios, batedor, `analisarDefesa` e telas passam a guardar a qualidade
além do tipo. Alternativa mais leve, se pesar demais: veterania (tropas que vencem batalhas ficam mais fortes).

### Reserva

Se o teste da 6 mostrar o ouro apertado mesmo com câmbio e acordos, subir a produção de ouro de 4 para 5 por
trabalhador (+25%, `producao.porTrabalhadorHora.ouro`).
