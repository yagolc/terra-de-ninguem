# Imagens do jogo: guia e prompts

Lote 1 (pronto): **24 imagens de prédios** (8 prédios × 3 fases) e **3 cenas de treino** no Quartel. Lote 2: estruturas, povoados, heróis e raças (no fim deste guia).

## Como gerar

1. Use **uma única conversa** na ferramenta de IA (ChatGPT, Gemini, Leonardo, Midjourney...). O estilo fica mais parecido entre as imagens.
2. Comece pela **Casa, fase 1**. Gere até gostar dela: ela é a referência de estilo.
3. Nas próximas, cole o prompt e acrescente no fim: *"Same art style, lighting, camera angle and background as the previous images."* Se a ferramenta aceitar imagem de referência, anexe a Casa fase 1.
4. Os prompts estão em inglês porque as ferramentas seguem melhor. Em cada um, o **bloco de estilo** se repete de propósito: é ele que mantém tudo igual.

## Formato

- **Quadrado (1:1)**, o maior tamanho que a ferramenta der (1024×1024 está ótimo).
- **Fundo marrom-escuro liso (#2a1f19)**, a mesma cor dos cards do jogo, para a imagem "sumir" no card. Fundo transparente também serve.
- Sem texto, letras ou moldura na imagem.
- PNG ou JPG. Eu converto para WebP, reduzo e encaixo no jogo.

## Nomes dos arquivos

Salve assim em `docs/arte/originais/` (fica fora do site) e rode `npm run arte`: ele converte para WebP de 512 px em `apps/web/src/assets/arte/` (precisa do ffmpeg). O card do prédio usa a imagem da fase sozinho; a que faltar fica com a fase anterior ou com o emoji.

| Arquivo | O que é |
| --- | --- |
| `centro-1.png`, `centro-2.png`, `centro-3.png` | Centro da Cidade, fases 1, 2 e 3 |
| `casa-1.png` … `casa-3.png` | Casa |
| `fazenda-1.png` … `fazenda-3.png` | Fazenda |
| `serraria-1.png` … `serraria-3.png` | Serraria |
| `mercado-1.png` … `mercado-3.png` | Mercado |
| `armazem-1.png` … `armazem-3.png` | Armazém |
| `quartel-1.png` … `quartel-3.png` | Quartel |
| `muralha-1.png` … `muralha-3.png` | Muralha |
| `treino-lanceiro.png`, `treino-arqueiro.png`, `treino-cavalaria.png` | Cenas de treino no Quartel |

**Fases:** 1 = níveis 1 a 3, 2 = níveis 4 a 7, 3 = níveis 8 a 10. Prédio no nível 0 (ainda não construído) mostra a fase 1 apagada, em cinza: não precisa de imagem própria.

---

## Bloco de estilo (já incluído em cada prompt)

> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1.

---

## Centro da Cidade

**centro-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a small wooden village longhouse with a thatched roof, a carved wooden door and a tall pole with a simple cloth banner, a few crates by the entrance.

**centro-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a two-story timber-framed town hall on a stone foundation, red clay tile roof, a small bell tower, wooden balcony and two banners at the door.

**centro-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a grand stone town hall with a tall clock tower, slate roofs, stained glass windows, golden banners, wide stone steps and a small fountain in front.

## Casa

**casa-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a small humble wooden peasant hut with a thatched roof, smoke rising from a clay chimney, a stack of firewood by the door.

**casa-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a cozy stone and timber-frame cottage with a tiled roof, flower boxes under the windows, a lantern by the door and a small vegetable patch.

**casa-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a large two-story stone manor house with a slate roof, several chimneys, a small round tower, glass windows glowing warmly and a tidy garden with a low stone fence.

## Fazenda

**fazenda-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a tiny farm plot with a few rows of young wheat, a scarecrow, a small wooden tool shed and a wooden bucket.

**fazenda-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a farmhouse with a wooden barn, a field of golden wheat, a hay cart, sacks of grain and a couple of chickens.

**fazenda-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a large prosperous farm estate with a big barn, a tall stone windmill, rich golden wheat fields, round haystacks and a granary.

## Serraria

**serraria-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a woodcutter's camp with a tree stump holding an axe, a small pile of logs, wood chips on the ground and a simple lean-to shelter.

**serraria-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: an open timber sawmill shed with a large two-man saw on a log, neatly stacked planks, sawdust piles and a log cart.

**serraria-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a large water-powered sawmill building with a turning waterwheel on a small stream, big stacks of planks and logs, and a wooden crane.

## Mercado

**mercado-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a single wooden market stall with a striped cloth awning, a few crates of goods, a small scale and a pouch of coins.

**mercado-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a small cobblestone market square with three colorful stalls around a stone well, barrels, pottery, bolts of cloth and baskets of fruit.

**mercado-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a grand covered stone market hall with arches, rich banners, open chests of gold coins, spices, silk and a merchant's counting table.

## Armazém

**armazem-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a small wooden storage shed with a plank door, a few sacks of grain and two barrels beside it.

**armazem-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a sturdy timber warehouse with a large loading door, a rope pulley on the upper floor, stacked crates, sacks and barrels.

**armazem-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a large fortified stone granary and treasury with iron-banded doors, a guard torch, rows of crates, sacks of grain and a locked chest of gold.

## Quartel

**quartel-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a simple military camp with a canvas tent, a straw training dummy, a wooden weapon rack with spears and a campfire.

**quartel-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a timber barracks building with a fenced dirt training yard, archery targets, straw dummies and weapon racks with spears and bows.

**quartel-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a stone barracks fortress with a parade ground, stables, red war banners, an armory with shields on the wall and rows of weapon racks.

## Muralha

**muralha-1** (simples)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a short curved section of wooden palisade wall made of sharpened logs, with a simple wooden gate and a lookout platform.

**muralha-2** (média)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a short curved section of stone wall with a reinforced wooden gate, a wooden walkway on top and a small square tower.

**muralha-3** (grande)
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a tall fortified stone wall section with two round towers, crenellations, an iron portcullis gatehouse and banners waving on top.

## Cenas de treino no Quartel

**treino-lanceiro**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: three spearmen in padded leather armor and round shields practicing spear thrusts at a straw training dummy, a sergeant with a helmet watching them.

**treino-arqueiro**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: three archers in green hoods and leather jerkins shooting longbows at round straw targets, arrows stuck in the targets, a quiver stand nearby.

**treino-cavalaria**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: two armored knights on horseback with lances charging at a wooden quintain target in a small fenced riding ring, dust rising from the hooves.

---

## Lote 2: mapa, heróis e raças

**16 imagens.** Mesmo jeito de gerar do lote 1 (mesma conversa, anexe a Casa fase 1 de referência). Os retratos de heróis e raças usam outro bloco de estilo, de **retrato do peito para cima**, porque são pessoas e não prédios: gere primeiro o **humano** e use ele de referência para os outros retratos.

| Arquivo | O que é | Onde aparece no jogo |
| --- | --- | --- |
| `estrutura-torre.png`, `estrutura-palicada.png`, `estrutura-entreposto.png` | Estruturas dos territórios | Menu de construir no território e painel do território que tem a estrutura |
| `vila-1.png`, `vila-2.png`, `vila-3.png` | Vila: 1 = nível 0 e 1 (neutra ou recém-tomada), 2, 3 | Painel do povoado no mapa |
| `cidade-livre.png` | Cidade livre | Painel do povoado no mapa |
| `heroi-comandante.png`, `heroi-castelao.png`, `heroi-desbravador.png`, `heroi-saqueador.png`, `heroi-intendente.png` | Retrato do herói por especialidade | Painel do herói, recrutamento e escolha do herói na marcha |
| `raca-humano.png`, `raca-elfo.png`, `raca-orc.png`, `raca-anao.png` | Retrato de cada povo | Tela de Fundação (escolha da raça) e regras |

No mapa em si os ícones continuam pequenos (emoji): uma imagem de 30 px não se lê. As imagens entram nos painéis que abrem ao tocar.

Os heróis servem para qualquer raça, então os prompts pedem rosto meio escondido (elmo, capuz, sombra) e sem orelha pontuda ou presa: assim um herói não parece de outro povo.

### Bloco de estilo dos retratos

> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1.

---

### Estruturas

**estrutura-torre**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a tall narrow wooden watchtower on four log legs, a small roofed lookout platform on top with a lit brazier, a ladder and a horn hanging on a post.

**estrutura-palicada**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a short ring of sharpened wooden stakes and logs bound with rope, earth piled at the base, a narrow gap as an entrance and a small banner pole.

**estrutura-entreposto**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a small roadside trading post: an open wooden stall with a canvas awning, stacked sacks of grain, logs and a small chest of coins, a hand cart beside it.

### Povoados

**vila-1**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a tiny hamlet of two humble thatched huts and a small vegetable patch, a dirt path and a wooden well.

**vila-2**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a small village of four thatched cottages around a stone well, a little wooden chapel, fenced gardens and a hay cart.

**vila-3**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a prosperous village of timber-framed houses with tiled roofs around a small square, a stone chapel with a bell, a windmill and a low stone fence.

**cidade-livre**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration. Isometric 3/4 view of a single subject standing on a small round patch of grass and packed dirt, centered, fully visible with empty margin around it. Warm late-afternoon light, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the subject. No text, no letters, no logos, no border. Square 1:1. Subject: a proud independent walled town on a hill, stone walls with a gate, tightly packed tall houses with red roofs, a cathedral spire and colorful guild banners, no single ruler's flag.

### Heróis

**heroi-comandante**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a battle-hardened war commander in a plumed steel helmet with a face guard that hides most of the face, plate armor over a red tabard, gripping a sword hilt, a battle-scarred cape.

**heroi-castelao**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a stern castle warden in a closed great helm and heavy mail, holding a large kite shield with an iron boss in front of the chest, a ring of keys on the belt.

**heroi-desbravador**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a swift pathfinder in a deep hood that shadows the face, leather riding coat, a rolled map and a compass on the belt, a scarf blowing in the wind.

**heroi-saqueador**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a cunning raider in a dark hood and a cloth mask over the lower face, studded leather armor, a heavy coin pouch and a curved dagger, a sly confident posture.

**heroi-intendente**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a wise steward in fine but practical robes with a fur collar and a wide-brimmed hat casting a shadow over the eyes, holding a ledger and a quill, a ring of keys and a small scale on the belt.

### Raças

**raca-humano**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a human settler leader, weathered friendly face with a short beard, simple wool cloak over leather armor, a wheat sheaf emblem brooch.

**raca-elfo**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: an elf ranger with long pointed ears and long hair, calm sharp eyes, green and brown leaf-patterned leather armor, a longbow over the shoulder, forest leaves in the hair.

**raca-orc**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: an orc warrior chieftain with green skin, lower tusks and a fierce grin, crude iron and fur armor, a heavy axe on the shoulder, war paint on the face.

**raca-anao**
> Hand-painted medieval fantasy strategy game art, warm painterly style like a board game illustration, same palette and lighting as the buildings. Portrait from the chest up, facing slightly to the side, centered with empty margin around the head. Warm late-afternoon light from the side, earthy palette of browns, ochre, muted gold and moss green. Solid plain dark brown background (#2a1f19), nothing behind the character. No text, no letters, no logos, no border. Square 1:1. Subject: a dwarf miner lord, short and broad with a long braided beard decorated with gold rings, a sturdy iron helmet, a pickaxe on the shoulder, warm forge light on the face.
