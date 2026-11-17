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
perde a renda e o outro fica sabendo (dá peso a manter a paz). Público ou secreto: decidir (público deixa os outros
verem as alianças; secreto mantém o mistério dos pactos). Números em `BALANCEAMENTO.comercio`.

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

### Reserva

Se o teste da 6 mostrar o ouro apertado mesmo com câmbio e acordos, subir a produção de ouro de 4 para 5 por
trabalhador (+25%, `producao.porTrabalhadorHora.ouro`).
