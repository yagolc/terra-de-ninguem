# Imagens do jogo: guia e prompts

Lote 1: **24 imagens de prédios** (8 prédios × 3 fases) e **3 cenas de treino** no Quartel.

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

## Lote 2 (depois, se o lote 1 der certo)

- Estruturas do mapa: torre de vigia, paliçada, entreposto.
- Povoados: vila (3 níveis) e cidade livre.
- Heróis: um retrato por especialidade (Comandante, Castelão, Desbravador, Saqueador, Intendente).
- Raças: um retrato de cada povo (Humano, Elfo, Orc, Anão) para a tela de Fundação.
