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

**Proposta:** cada soldado custa ouro por hora (ex.: lanceiro 0,5, arqueiro 0,5, cavalaria 1), em
`BALANCEAMENTO.unidades.<tipo>.soldoOuroHora`. Sem ouro, desertam como já acontece sem comida (`atualizarCidade`). O
ouro é o recurso mais raro (4/h por trabalhador), então exército grande exige gente no Mercado: volta a valer o pilar
"cada habitante é trabalhador ou soldado". Conferir com o simulador e um teste de quantos soldados uma cidade típica
sustenta.

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
