# Terra de Ninguém

Jogo de estratégia medieval, assíncrono, no navegador, para um grupo fechado de até 6 amigos (entrada só por convite). Cada jogador evolui sua cidade em tempo real (produz mesmo offline) e disputa territórios num mapa compartilhado, com diplomacia no estilo War. Partidas em temporadas de 2 a 4 semanas, com objetivo secreto e reset do mapa.

Documentos de referência (leia antes de decisões de design):
- `docs/GDD.md`: design do jogo (recursos, prédios, unidades, combate, mapa, proteções, temporadas).
- `docs/plano-tecnico.md`: stack, modelo de dados, lógica do servidor, telas e ordem dos 8 épicos.

**Status:** Épicos 1 a 7 prontos (Fundação, Regras, Cidade, Mapa e temporada, Exército, Ataques, Objetivos e fim de temporada); próximo é o 8 (playtest e balanceamento). Temporadas de 3 semanas. Fila de até 3 obras e até 5 lotes de treino, independentes. Marchas a 20 léguas/h (cavalaria 40): vizinhos em ~20–30 min. Temporada 2 ativa (semente 2026, mapa para 6 jogadores). Épico 1: Projeto Supabase `wbhcmkortcklhcojphlx` (região São Paulo, plano Free) ligado à CLI; migration 0001 e a função `resgatar-convite` publicadas; e-mails em português saindo por SMTP do Gmail. Frontend publicado na Vercel em https://terra-de-ninguem.vercel.app (Root Directory `apps/web`, republica a cada push na `main` de github.com/yagolc/terra-de-ninguem; variáveis `VITE_*` configuradas no painel da Vercel).

## Pilares que guiam decisões

1. Estratégia acima da sorte: aleatoriedade de no máximo ±10% numa batalha.
2. Tensão sem frustração: ninguém perde tudo de uma vez (saque máx. 30%, escudo, proteção de iniciante, cidade principal nunca é conquistada).
3. Escolhas com custo: cada habitante é trabalhador ou soldado, nunca os dois.
4. A diplomacia é o jogo.
5. Sessões curtas: 5 a 10 minutos já rendem progresso.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Interface | React + Vite + TypeScript (`apps/web`) |
| Mapa | Phaser 3 (entra no Épico 4) |
| Estilo | Tailwind CSS v4 (plugin `@tailwindcss/vite`) |
| PWA | vite-plugin-pwa (entra depois) |
| Servidor | Supabase Edge Functions (Deno) |
| Banco | Postgres no Supabase, com Row Level Security |
| Login | Supabase Auth, link mágico por e-mail, só por convite |
| Agendamento | pg_cron (resolve marchas, encerra temporadas) |
| Testes | Vitest |
| Hospedagem | Cloudflare Pages ou Vercel |

## Estrutura

```
apps/web/            # frontend React (telas em src/telas, cliente Supabase em src/lib)
packages/regras/     # @terra/regras: fórmulas puras de produção, custos e batalha
supabase/
  migrations/        # SQL numerado: tabelas, RLS, jobs pg_cron
  functions/         # Edge Functions, uma pasta por comando (kebab-case)
docs/                # GDD e plano técnico
```

Monorepo com **npm workspaces** (não usar pnpm/yarn).

## Comandos

```bash
npm install          # na raiz, instala tudo
npm run dev          # frontend em http://localhost:5173
npm test             # Vitest em todos os pacotes
npm run typecheck    # tsc em todos os pacotes
npm run build        # build de produção
npm run temporada:nova -- --semente 1234 --jogadores 6
                     # gera mapa + prévia em supabase/.temp/previa-temporada.svg; com --aplicar encerra a
                     # temporada ativa e grava a nova (uma transação). Vagas iniciais sem dono ficam para quem chegar depois.
npm run simular -- --atacante 50l,20a,10c --defensor 40l,30a --terreno floresta --muralha 3
                     # simula 1000 batalhas (l/a/c = lanceiro/arqueiro/cavalaria; --cidade, --estoque, --armazem)

# Supabase (CLI já logada e ligada ao projeto; rode na raiz)
npx supabase db push --linked                                  # aplica migrations novas
npx supabase functions deploy <nome>                           # publica uma Edge Function
npx supabase config push                                       # aplica supabase/config.toml (Auth etc.) no projeto
npx supabase db query --linked "select public.gerar_convite('amigo@email.com');"  # cria convite
npx supabase db advisors --linked                              # checagem de segurança/RLS
```

`supabase/config.toml` é a fonte da verdade das configurações do projeto (cadastro público desligado, URLs de redirecionamento). Mude ali e rode `config push`, não no painel; confira o diff antes de confirmar.

**Login:** "Entrar com Google" é o principal; código de 8 dígitos por e-mail (`{{ .Token }}` nos modelos, `verifyOtp`) é a alternativa para quem não usa Google, e funciona mesmo lendo o e-mail em outro aparelho. Cadastro público continua desligado: o convite (`resgatar-convite`, `metodo: 'google'`) cria a conta já confirmada sem e-mail, e o primeiro login Google com o mesmo endereço é ligado a ela automaticamente (testado). Cliente OAuth no Google Cloud (projeto "Terra de Ninguem", app publicado) com redirect `https://wbhcmkortcklhcojphlx.supabase.co/auth/v1/callback`.

Exceção: o SMTP (Gmail pessoal com senha de app) e o provedor Google (Client ID/Secret) são configurados **só no painel** (Authentication → Emails → SMTP Settings), porque tem senha. Mantenha `[auth.email.smtp]` comentado e não crie `[auth.external.google]` no `config.toml`, para o `config push` não mexer neles. Os modelos de e-mail ficam em `supabase/templates/` e só podem ser alterados com SMTP próprio ativo.

## Como um comando funciona (padrão do Épico 3)

- **Edge Function** (`supabase/functions/<nome>/index.ts`) importa as regras direto de `../../../packages/regras/src/index.ts`; o deploy leva os arquivos junto. Código comum fica em `supabase/functions/_compartilhado/` (`auth.ts` valida o token com `getUser`, `db.ts` conecta direto ao Postgres via `SUPABASE_DB_URL`, `http.ts` tem CORS e `ErroDoJogo`).
- Funções publicadas com `--no-verify-jwt` e `verify_jwt = false` no `config.toml`: o token é validado no código.
- Cada comando: `sql.begin` → `select ... for update` na cidade e nas tropas do jogador → `avancarCidade` até agora (conclui obras e lotes de treino em ordem, consumo de comida e deserção) → valida com `verificar*` das regras → grava cidade, tropas (`distribuirPerdas` entre territórios), `obras` e `filas_treino`. Recusas lançam `ErroDoJogo(MENSAGENS_*[motivo])`.
- Obras e lotes concluídos só são gravados no próximo comando; o navegador já os mostra porque calcula com `avancarCidade`.
- Sem Deno local: para checar tipos das Edge Functions, rode `tsc` com `paths` apontando `npm:postgres@3.4.5` e `jsr:@supabase/supabase-js@2` para os pacotes do npm.
- O gerador de mapa (`@terra/regras/mapa`, usa `d3-delaunay`) fica **fora** do `index.ts` das regras: só o script de temporada e testes o importam; Edge Functions e site leem o mapa pronto do banco.
- `territorios.guarnicao_inicial` (força dos bárbaros) não tem `grant select`: liste as colunas no `select` do cliente, nunca `*`.
- **Ataques (Épico 6):** `enviar_marcha` (função `cidade`) tira as tropas do território e cria a marcha. O pg_cron (migration 0007) chama `resolver-marchas` a cada minuto com o cabeçalho `x-segredo-cron`: a senha fica no Vault (`segredo_cron`) e na variável `SEGREDO_CRON` da função (`npx supabase secrets set`), nunca no git. Cada marcha é resolvida numa transação (`for update skip locked`), travando as cidades por ordem de id; sorte = `sementeDeTexto(marcha.id)`. Perdedor perde 70%; conquista exige 1,5×; o defensor derrotado recua para a cidade dele e ganha escudo de 8 h; atacar quebra o próprio escudo.
- **Objetivos (Épico 7):** sorteados em `garantirObjetivo` quando o jogador entra (ação `entrar`), com semente da temporada + jogador; secretos pelo RLS até a temporada encerrar. A cada minuto, depois das marchas, `atualizarPlacar` recalcula o `placar` (público), confere os objetivos e encerra a temporada (objetivo cumprido, ou prazo → mais pontos). Encerrada, os comandos param (`temporadaAtiva` recusa) e o site mostra a tela de fim até você rodar `temporada:nova`.
- Código de cidade compartilhado em `_compartilhado/cidade.ts` (`carregarCidade` → `avancarAteAgora` → mexe → `salvarCidade`). Tropas em marcha comem e ocupam população, mas não desertam.
- Para conferir o agendador: `select status_code, content from net._http_response order by created desc limit 5`. Para testar sem esperar: `update marchas set chegada_em = now() where id = ...` (só em teste).
- **Frontend** lê pelo PostgREST (RLS só leitura), recalcula a cada segundo com `avancarCidade` e manda comandos com `chamarFuncao` (`apps/web/src/lib/funcoes.ts`), relendo a cidade depois.

## Regras de arquitetura (não quebrar)

- **Servidor autoritativo.** O cliente só mostra estado e envia comandos para Edge Functions. Ele nunca dá `insert`/`update` direto em tabelas de jogo; as políticas RLS não devem permitir isso.
- **Regras puras.** `packages/regras` não acessa banco, rede, relógio nem `Math.random` direto: recebe números (incluindo o instante atual e a semente/valor aleatório) e devolve números. É usado pelo servidor e pelo cliente para calcularem igual.
- **Produção por tempo decorrido.** Nada roda a cada segundo. Antes de qualquer comando, o servidor atualiza a cidade a partir de `atualizado_em`.
- **Comandos em transação** com trava na linha da cidade (`select ... for update`) para evitar gasto duplo.
- **RLS em toda tabela**, sem exceção. Segredos (objetivos, tropas e marchas alheias) nunca são legíveis por outros jogadores.
- **Balanceamento num único arquivo** de configuração em `packages/regras` (custos, tempos, produção). Nada de número mágico espalhado.
- **Quase tudo pertence a uma temporada.** Só `jogadores` atravessa temporadas.

## Convenções

- **Idioma do domínio: português**, sem acentos em identificadores: tabelas, colunas, tipos e funções do jogo (`cidades`, `atualizado_em`, `construirPredio`, `construir_predio`). Termos técnicos genéricos podem ficar em inglês (`useSession`, `props`).
- SQL em `snake_case`; TypeScript em `camelCase` para variáveis/funções e `PascalCase` para tipos e componentes.
- Migrations: `supabase/migrations/NNNN_descricao.sql`, nunca editar uma migration já aplicada; crie outra.
- TypeScript `strict` com `noUncheckedIndexedAccess`. Sem `any`.
- Componentes React em função, um por arquivo; telas em `src/telas/`.
- UI responsiva, mobile first: no celular, barra inferior (Cidade, Mapa, Relatórios); no desktop, mapa no centro e painéis ao lado.
- Toda fórmula nova em `packages/regras` vem com teste Vitest; para limites do GDD (sorte ±10%, saque ≤ 30%, perdas válidas), teste também com centenas de casos gerados por `geradorComSemente`.
- Em `packages/regras`, imports relativos levam a extensão `.ts` (`from './batalha.ts'`) e só sintaxe apagável (sem `enum`/`namespace`): o mesmo código roda no Vite, no Deno (Edge Functions) e no Node 24 (simulador) sem build.
- Tempos nas regras são timestamps em ms; taxas no balanceamento são "por hora". Validações devolvem `{ ok: true, ... } | { ok: false, motivo }` com motivos em `snake_case`, que o servidor traduz para a mensagem do jogador.
- Textos da interface em português do Brasil.
- Variáveis de ambiente do frontend com prefixo `VITE_`; chaves secretas (service role) só nas Edge Functions, nunca no frontend nem no git.
