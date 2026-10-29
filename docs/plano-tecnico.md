# Plano técnico do MVP — Terra de Ninguém

Oct 29, 2026 · @Yago

## Stack e estrutura do repositório

Tudo em TypeScript, num único repositório. As regras do jogo (fórmulas de produção, custos e batalha) ficam num pacote compartilhado, usado pelo servidor e pelo cliente, para os dois calcularem igual.

| Camada | Tecnologia | Papel |
| --- | --- | --- |
| Interface | React + Vite + TypeScript | Telas, menus e fluxo do jogo |
| Mapa | Phaser 3 | Desenho e interação com o mapa de territórios |
| Estilo | Tailwind CSS | Layout responsivo para celular e desktop |
| PWA | vite-plugin-pwa | Instalação na tela inicial e notificações |
| Lógica do servidor | Supabase Edge Functions | Comandos do jogador: construir, treinar, atacar |
| Banco | Postgres (Supabase) com Row Level Security | Estado do jogo; cada jogador só lê o que pode ver |
| Login | Supabase Auth com link mágico por e-mail | Entrada só por convite |
| Agendamento | pg\_cron | Resolve marchas e encerra temporadas |
| Hospedagem | Cloudflare Pages ou Vercel | Publica o frontend de graça |
| Testes | Vitest | Testes das regras de jogo |

```
terra-de-ninguem/
├── apps/web/            # React + Phaser
├── packages/regras/     # fórmulas e regras puras, sem banco
└── supabase/
    ├── migrations/      # tabelas, políticas RLS, jobs pg_cron
    └── functions/       # Edge Functions (comandos do jogo)
```

## Modelo de dados

Quase tudo pertence a uma temporada, então resetar o mapa é só criar uma temporada nova. O jogador é a única entidade que atravessa temporadas.

| Tabela | Campos principais | Observação |
| --- | --- | --- |
| jogadores | id (do Auth), nome, cor | Atravessa temporadas |
| convites | codigo, email, usado\_em | Só quem tem convite cria conta |
| temporadas | numero, inicio, fim\_previsto, status, vencedor\_id | Uma ativa por vez |
| regioes | temporada\_id, nome | Os "continentes" do mapa gerado |
| territorios | temporada\_id, regiao\_id, nome, terreno, bonus, dono\_id, x, y | x e y servem para desenhar o mapa |
| fronteiras | territorio\_a, territorio\_b | Quem é vizinho de quem |
| cidades | temporada\_id, jogador\_id, territorio\_id, comida, madeira, ouro, populacao, trabalhadores por recurso, atualizado\_em | atualizado\_em é a base do cálculo por tempo |
| predios | cidade\_id, tipo, nivel, pronto\_em | pronto\_em preenchido = em construção |
| filas\_treino | cidade\_id, tipo\_unidade, quantidade, pronto\_em | Tropas em treinamento |
| tropas | territorio\_id, dono\_id, tipo\_unidade, quantidade | Tropas paradas num território |
| marchas | jogador\_id, origem\_id, destino\_id, tipo (saque ou conquista), tropas, partida\_em, chegada\_em, status | Ataques a caminho |
| relatorios | marcha\_id, atacante\_id, defensor\_id, resultado, criado\_em | Visível só para os dois lados |
| objetivos | temporada\_id, jogador\_id, tipo, parametros, cumprido\_em | Secreto: só o dono lê |
| protecoes | jogador\_id, tipo (escudo ou iniciante), ate | Bloqueia ataques até a data |

As políticas de Row Level Security garantem o sigilo: ninguém lê objetivos, tropas ou marchas dos outros direto do banco.

## Lógica do servidor

O cliente nunca altera o banco direto: ele só envia comandos para as Edge Functions, que validam e aplicam. Assim ninguém trapaceia editando valores no navegador.

**Produção por tempo.** Antes de qualquer comando, o servidor "atualiza" a cidade: calcula quanto tempo passou desde atualizado\_em, soma a produção do período, respeita o limite do armazém e desconta o consumo de comida das tropas. Depois grava os novos valores e o horário atual. Não existe processo rodando a cada segundo.

**Comandos do MVP**

- construir\_predio e evoluir\_predio
- alocar\_trabalhadores
- treinar\_tropas
- enviar\_marcha (saque ou conquista)

Cada comando roda numa transação e trava a linha da cidade, para dois cliques seguidos não gastarem o mesmo recurso duas vezes.

**Ciclo de um ataque**

1. O jogador envia a marcha. O servidor valida vizinhança, tropas, proteções e calcula chegada\_em.
2. As tropas saem do território de origem e a marcha fica a caminho.
3. A cada minuto, um job do pg\_cron busca marchas com chegada\_em vencida.
4. Para cada uma, atualiza a cidade do defensor, resolve a batalha com as regras do pacote compartilhado e aplica perdas, saque ou conquista.
5. Grava o relatório, devolve os sobreviventes para casa (uma nova marcha de volta) e verifica se alguém cumpriu o objetivo secreto.

**Regras puras e testáveis.** As fórmulas de produção e batalha não acessam o banco: recebem números e devolvem números. Isso permite testar o balanceamento com Vitest sem subir nada.

## Telas do MVP

São 6 telas. No celular, uma barra inferior troca entre Cidade, Mapa e Relatórios; no desktop, o mapa ocupa o centro e os painéis ficam ao lado.

| Tela | O que mostra | Ações |
| --- | --- | --- |
| Entrada | Login por link mágico e código de convite | Entrar, criar conta |
| Cidade | Recursos, população, prédios e filas | Construir, evoluir, alocar trabalhadores, treinar |
| Mapa | Territórios, donos por cor, regiões e marchas próprias a caminho | Ver território, enviar ataque |
| Enviar ataque | Tropas disponíveis, alvo, tempo de marcha | Escolher tropas e tipo de ataque |
| Relatórios | Lista de batalhas, com perdas e saque | Abrir detalhe |
| Objetivo e ranking | Objetivo secreto do jogador e ranking da temporada | Nenhuma no MVP |

## Ordem de implementação

São 8 épicos em sequência, cada um com uma entrega que dá para testar. O primeiro ataque entre amigos acontece no épico 6.

1. **Fundação:** repositório, projeto no Supabase, frontend publicado e login por convite. *Entrega: os amigos conseguem entrar.*
2. **Regras do jogo:** pacote com fórmulas de produção, custos e batalha, coberto por testes. *Entrega: simulações de batalha no terminal.*
3. **Cidade:** tabelas, atualização por tempo, construir, evoluir, alocar trabalhadores e a tela Cidade. *Entrega: cada um evolui sua cidade sozinho.*
4. **Mapa e temporada:** gerador de regiões, territórios e fronteiras para até 6 jogadores, posição das cidades e a tela Mapa. *Entrega: todos veem o mesmo mapa.*
5. **Exército:** treinamento, tropas nos territórios e consumo de comida. *Entrega: exércitos prontos para sair.*
6. **Ataques:** envio de marchas, job do pg\_cron, batalha, saque, conquista, proteções e relatórios. *Entrega: o primeiro ataque de verdade.*
7. **Objetivos e fim de temporada:** sorteio do objetivo secreto, verificação de vitória, pontos e ranking. *Entrega: uma temporada completa.*
8. **Playtest e balanceamento:** uma temporada curta com o grupo, ajustando números a partir do que acontecer.

## Riscos e decisões em aberto

| Risco | Impacto | Como lidar |
| --- | --- | --- |
| Pausa do Supabase gratuito após 7 dias sem uso ([fonte](https://makerkit.dev/blog/saas/supabase-pricing)) | Jogo fora do ar entre temporadas | O job do pg\_cron já mantém atividade; confirmar na prática |
| Mapa gerado desequilibrado | Um jogador começa com vantagem | Testar o gerador com várias sementes antes de cada temporada |
| Notificações no iPhone | Só funcionam com o PWA instalado na tela inicial | Explicar a instalação na primeira entrada |
| Ataques de madrugada | Quem dorme sempre perde | Decidido: ataques noturnos são permitidos. Torre de vigia, escudo e o limite de saque já protegem quem dorme |
| Balanceamento | Uma unidade ou estratégia dominante | Números em um único arquivo de configuração, fácil de ajustar |

- [ ] pg\_cron: confirmado, disponível no plano gratuito do Supabase
- [ ] Janela noturna: decidido, não haverá. Ataques podem acontecer a qualquer hora
