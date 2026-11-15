# Proposta: salas (partidas em paralelo)

15/11/2026 · análise para aprovação do Yago. Nada foi implementado.

## Decisões do Yago (15/11/2026)

1. A sala tem temporadas próprias.
2. No começo, só o Yago cria salas, por uma tela no site. No futuro, jogadores poderão comprar uma sala com gemas.
3. Cada jogador joga no máximo 3 partidas ao mesmo tempo (a Sala principal conta).
4. Gemas e itens valem em todas as salas; o contador de usos de gemas (⚡ terminar obra, preço que dobra, ⚡N no placar) é separado por sala.
5. Cada sala tem o próprio herdeiro do trono, a partir da segunda temporada dela.

6. A primeira sala nova abre para o grupo junto com a temporada 6 (04/12/2026). Até lá, só a sala de teste do Yago; os passos 1 a 5 podem ir para produção antes, porque não mudam nada para quem joga.
7. A crônica (e o item "crônica" da loja) fica só na Sala principal.

## Resumo

- **Sala = mesa de jogo com a sua própria sequência de temporadas.** A temporada 5 de hoje vira a temporada 5 da **Sala principal**; uma sala nova começa na temporada 1 dela, com mapa, placar, objetivos, herdeiro e hordas próprios.
- **A boa notícia:** quase todas as tabelas de jogo já têm `temporada_id` (cidades, territórios, tropas, marchas, relatórios, cartas, pets, heróis, hordas…). O banco já aguenta várias partidas; o que trava é o código, que procura "**a** temporada ativa" em 24 consultas: 9 no servidor (7 arquivos), 14 no site (10 arquivos) e 1 no script de temporada.
- **Segurança da temporada 5:** o banco hoje proíbe duas temporadas ativas (índice `temporadas_uma_ativa`). Essa trava fica no lugar até servidor e site já saberem escolher a sala. Só aí sai a trava e nasce a segunda sala.
- **Volume:** 5 temporadas ocupam 4 MB (banco inteiro: 30 MB de 500 MB). Espaço não é problema.

## 1. O que muda no modelo de dados

### Tabelas novas (migration 0037)

| Tabela | Campos | Observação |
| --- | --- | --- |
| `salas` | `id`, `nome`, `principal` (bool, só uma), `criador_id`, `acesso` (`aberta`/`convite`), `jogadores_maximo`, `duracao_dias`, `status` (`aberta`/`arquivada`), `criado_em` | Pública para logados (nome, quem está, quando acaba) |
| `salas_membros` | `sala_id`, `jogador_id`, `convidado_por`, `criado_em` | Só para salas `convite`: quem pode entrar |

`temporadas` ganha `sala_id` (todas as 5 de hoje apontam para a Sala principal, preenchido na própria migration).

### Travas que mudam (migration 0038, **só depois** do servidor e do site novos estarem no ar)

| Hoje | Depois |
| --- | --- |
| `temporadas_uma_ativa`: uma ativa no jogo inteiro | uma ativa **por sala**: `unique (sala_id) where status = 'ativa'` |
| `temporadas.numero` único no jogo | único por sala: `unique (sala_id, numero)` |

### Onde o código assume uma temporada só

| Lugar | Hoje | Depois |
| --- | --- | --- |
| `_compartilhado/cidade.ts` `temporadaAtiva` | `where status = 'ativa'` | recebe o `temporada_id` que o site manda; **sem ele, usa a da Sala principal** (o site antigo, guardado no celular, continua funcionando) |
| `criarCidade`, `pets.ts`, `loja.ts` (item de temporada, arauto), `perfil.ts` (cor) | pegam "a ativa" | recebem a temporada escolhida |
| `herdeiroDoTrono` | última encerrada do jogo | última encerrada **da mesma sala** |
| `resolver-marchas` (marchas e hordas que chegaram) | já junta com `status = 'ativa'`, serve para várias | igual; o limite de 50 marchas por minuto passa a valer por sala |
| `soltarHordaSeForHora`, `atualizarPlacar` | `select ... where status = 'ativa' for update` (uma linha) | **um laço por sala ativa, cada uma na sua transação**: erro numa sala não para as outras |
| `avisarJogadores` | sem nome de sala | título com o nome da sala (quando não é a principal) e link que abre a sala certa |
| `temporada:nova` | encerra **a** ativa e cria a próxima com número global | `--sala <nome>` (sem ele, Sala principal): encerra só a ativa daquela sala |
| `pedidos_cronica(numero)` | número da temporada | número + sala |
| Site: `useTemporada`, `useMapa`, `useCidade`, `useCartas`, `useRelatorios`, `useGemas`, `usePerfil`, `pets.ts`, `Jogo.tsx` | `.eq('status', 'ativa').maybeSingle()` | leem a temporada da sala escolhida |

Nada muda nas regras puras (`packages/regras`): batalha, produção, objetivos e mapa já recebem tudo por parâmetro. A única coisa nova lá é `verificarSala` (nome, jogadores, duração), com teste.

## 2. O que é uma sala (proposta)

| Ponto | Proposta | Por quê |
| --- | --- | --- |
| Quem cria | **Decidido:** só você, pela tela **Criar sala** do site (aparece só para quem está em `organizadores`, como o painel do feedback). Você escolhe nome, acesso, jogadores, dias e semente (ou sorteia), vê a prévia do mapa e confirma | O mapa passa a ser gerado numa Edge Function nova, `salas`. Medi o gerador: 34 ms para 2 jogadores, 125 ms para 8, bem abaixo do limite de CPU do plano gratuito. O `temporada:nova` continua para a Sala principal, como hoje |
| Comprar sala (futuro) | `salas.criador_id` e o preço em `BALANCEAMENTO.loja` deixam o caminho pronto: na v2 a mesma ação `criar_sala` aceita jogador comum pagando gemas | Nada disso entra na v1 |
| Convite | Opção da sala: `aberta` (qualquer jogador do grupo entra até lotar) ou `convite` (só quem você listar) | O grupo já é fechado; a sala por convite serve para partidas menores ou de teste |
| Jogadores | 2 a 8, escolhido na criação (o mapa é gerado para esse número, como hoje) | Mapa menor dá partida mais rápida |
| Duração | Escolhida na criação (ex.: 7 dias); objetivos e monopólio valem igual | Partidas curtas são o ganho principal |
| Semente e mapa | Próprios, uma semente nova por temporada de cada sala | Igual ao de hoje |
| Regras | **Iguais em todas as salas na v1.** Velocidade (marchas, obras 2×) fica para depois | Velocidade mexe em todas as fórmulas e no balanceamento; é outro projeto |
| Depois que acaba | A sala mostra a tela de fim; na mesma tela de organizador você começa a próxima temporada dela (mapa novo) ou arquiva a sala | Cada sala conta as próprias temporadas: 1, 2, 3… |

## 3. Menu de salas no site

- **Botão "Salas" no cabeçalho** (ao lado do nome da sala atual). A tela lista cada sala: nome, temporada, jogadores (x de y), quando termina, se você tem cidade nela e avisos não lidos (relatórios, cartas). Botões **Abrir** (já joga) ou **Entrar** (tem vaga e você pode).
- **A escolha fica guardada no aparelho** (e no endereço, `?sala=<id>`, para os links dos avisos). Quem nunca mexer continua caindo na Sala principal: para ninguém da temporada 5 muda nada.
- Trocar de sala recarrega cidade, mapa, placar e cartas; o Phaser redesenha o mapa da outra sala.
- **Várias salas ao mesmo tempo: sim**, uma cidade independente em cada (recursos, tropas, herói, pets, cartas e pactos não passam de uma para outra). **Decidido:** no máximo 3 partidas em andamento por jogador, contando a Sala principal (`BALANCEAMENTO.salas.partidasPorJogador`). O `entrar` recusa a quarta; uma partida encerrada libera a vaga.

## 4. O que é global por jogador

| Coisa | Proposta |
| --- | --- |
| Gemas, pedidos, presentes | Globais (um saldo só, como hoje) |
| Itens permanentes (bandeiras, cores, títulos, pets comprados) | Valem em todas as salas |
| Itens de temporada (destaque da cidade, crônica) e ⚡ terminar obra | **Decidido:** gemas valem em todas as salas; o contador de usos é por sala (já é por temporada no banco): o preço do ⚡ dobra dentro de cada sala e o ⚡N do placar conta só aquela sala |
| Arauto | Publicado numa sala, aparece só nela |
| Perfil (nome, bandeira, descrição, título) | Global |
| **Cor no mapa** | **Por sala.** Hoje a fundação troca a cor do jogador (`jogadores.cor`) se alguém da temporada já a usa; com duas salas, essa troca bagunçaria a outra. Nova coluna `cidades.cor` (a cor naquela sala), lida por uma função pública como a das raças; `jogadores.cor` vira a preferida. Na temporada 5 a migration copia a cor atual: nada muda na tela |
| Raça | Por cidade (já é) |
| Herdeiro do trono | **Decidido:** por sala, a partir da segunda temporada dela: o vencedor da temporada anterior **daquela sala** (na primeira não há herdeiro) |
| Crônica | Só na Sala principal (é escrita à mão; não escala). O item "crônica" da loja não aparece nas outras salas |
| Avisos no celular | Uma inscrição por aparelho (como hoje), avisos de todas as salas, com o nome da sala no título |
| Cartas e pactos | Por sala (já são por temporada); só se escreve para quem tem cidade na mesma sala |
| Pets | Por sala: o pet comprado mora em cada cidade sua; sequestro numa sala não afeta a outra |
| Perfil público (histórico, rivalidades) | Junta todas as salas, com o nome da sala em cada temporada; rivalidades continuam só de temporadas encerradas |
| Relatórios e feedback | Relatórios por sala; feedback global |

## 5. Plano de migração seguro

A regra: **cada passo pode ir para produção sozinho sem mudar nada para quem joga a temporada 5**, e a segunda temporada ativa só pode existir no último passo.

1. **Migration 0037 (só acrescenta):** `salas`, `salas_membros`, Sala principal, `temporadas.sala_id` preenchido, `cidades.cor` copiada, funções públicas novas. A trava "uma ativa" continua. Nada no site nem nas funções lê isso ainda.
2. **Funções `cidade` e `resolver-marchas`:** aceitam `temporada_id`; sem ele, Sala principal. Laço por sala no placar e nas hordas (com uma sala só, faz exatamente o de hoje). Deploy sem pausa: a função antiga atende até a nova subir, e as duas fazem o mesmo com uma sala. Depois do deploy, conferir `net._http_response` por alguns minutos.
3. **Proteção do site antigo:** quem estiver com a versão antiga guardada no celular faz `.eq('status', 'ativa').maybeSingle()`, que **quebra** com duas temporadas ativas (e o `useTemporada` antigo poderia abrir a sala errada). Proposta: o site novo manda um cabeçalho (`x-terra-salas: 1`), e o RLS de `temporadas` só mostra salas além da principal para quem manda esse cabeçalho. O site antigo continua vendo só a Sala principal. Sai depois que a temporada 6 começar.
4. **Site novo:** sala escolhida, menu Salas, todos os hooks lendo a temporada da sala. Com uma sala só, a tela fica igual à de hoje (o botão Salas só aparece com mais de uma).
5. **Migration 0038:** troca as travas (uma ativa **por sala**, número por sala). Na implementação, vai junto com a 0037: a segunda temporada ativa só nasce pela função `salas`, publicada junto com as novas `cidade` e `resolver-marchas`.
6. **Função `salas` e tela Criar sala** (só organizador): gera o mapa no servidor e grava sala e temporada numa transação. Primeiro teste em produção: uma sala `convite` só sua, com mapa de 2 jogadores, para atacar, mandar carta, receber aviso e ver o placar sem ninguém mais ver.
7. **Abrir para o grupo** e anotar em `docs/novidades.md` (Temporada 6).

## 6. Riscos

| Risco | Impacto | Como lidar |
| --- | --- | --- |
| Duas temporadas ativas antes do código novo | Comandos e placar da temporada 5 pegam a sala errada | A trava do banco só sai no passo 5 |
| Site antigo guardado no celular (PWA) | Tela quebrada ou sala errada | Cabeçalho + RLS do passo 3; o aviso "Atualizar" já existe |
| `resolver-marchas` mais lento com várias salas | Marchas atrasando (o plano gratuito limita CPU por chamada) | Uma transação por sala, limite por sala; acompanhar o tempo nas primeiras horas. Hoje é 1 chamada por minuto, e continua assim |
| Grupo dividido entre salas | Menos diplomacia em cada mapa (pilar 4) | Limite de salas por jogador; salas secundárias pequenas e curtas |
| Gemas valendo em várias salas | Quem paga ganha vantagem em todas | Decidido assim; o preço do ⚡ dobra em cada sala |
| Mapa gerado numa Edge Function | Hoje ele só roda no Node | Medido: até 125 ms com 8 jogadores. A função precisa de um `deno.json` que aponte `d3-delaunay` para o pacote do npm; o `temporada:nova` não muda |
| Erro numa sala derrubar o minuto de todas | Marchas paradas no jogo inteiro | Cada sala em try/catch e transação própria, como já é feito por marcha |

**Ordem:** passos 1 a 5 podem ir para produção durante a temporada 5 sem nada visível. A primeira sala nova abre para o grupo junto com a temporada 6, em 04/12. Estimativa de trabalho: grande (perto do tamanho do Épico 7), a maior parte no site.
