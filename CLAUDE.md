# Terra de Ninguém

Jogo de estratégia medieval, assíncrono, no navegador, para um grupo fechado de até 6 amigos (entrada só por convite). Cada jogador evolui sua cidade em tempo real (produz mesmo offline) e disputa territórios num mapa compartilhado, com diplomacia no estilo War. Partidas em temporadas de 2 a 4 semanas, com objetivo secreto e reset do mapa.

Documentos de referência (leia antes de decisões de design):
- `docs/GDD.md`: design do jogo (recursos, prédios, unidades, combate, mapa, proteções, temporadas).
- `docs/plano-tecnico.md`: stack, modelo de dados, lógica do servidor, telas e ordem dos 8 épicos.

**Status:** Épico 1 (Fundação). Projeto Supabase `wbhcmkortcklhcojphlx` (região São Paulo, plano Free) ligado à CLI; migration 0001 e a função `resgatar-convite` publicadas. Falta: SMTP próprio para e-mails aos amigos e publicar o frontend.

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

# Supabase (CLI já logada e ligada ao projeto; rode na raiz)
npx supabase db push --linked                                  # aplica migrations novas
npx supabase functions deploy <nome>                           # publica uma Edge Function
npx supabase config push                                       # aplica supabase/config.toml (Auth etc.) no projeto
npx supabase db query --linked "select public.gerar_convite('amigo@email.com');"  # cria convite
npx supabase db advisors --linked                              # checagem de segurança/RLS
```

`supabase/config.toml` é a fonte da verdade das configurações do projeto (cadastro público desligado, URLs de redirecionamento). Mude ali e rode `config push`, não no painel; confira o diff antes de confirmar.

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
- Toda fórmula nova em `packages/regras` vem com teste Vitest.
- Textos da interface em português do Brasil.
- Variáveis de ambiente do frontend com prefixo `VITE_`; chaves secretas (service role) só nas Edge Functions, nunca no frontend nem no git.
