# Паттерн «тонкий локальный MCP-сервер по stdio»

Три библиотеки в монорепо реализуют один и тот же архитектурный паттерн: `libs/deploy-mcp`
(эталон, деплой через dashboard-agent API), `libs/form-mcp` (справочник по полям/формам),
`libs/studio-time-mcp` (тайм-трекер studio). Каждая — тонкая обёртка: вся бизнес-логика
остаётся снаружи (в приложении/сервисе), библиотека только предоставляет к ней MCP-инструменты
для Claude Code.

Общий для этих серверов boilerplate (парсер dotenv, формат ответа тула) вынесен в
`libs/mcp-server-kit` — см. [«Формат ответа тула»](#формат-ответа-тула--letarmcp-server-kit) ниже.
`form-mcp` этот паттерн не разделяет (не читает dotenv, оборачивает `content`/`isError` инлайн
без общих хелперов) — не переноси его на `@letar/mcp-server-kit` без явной необходимости.

## Когда применять

Когда **приложению/сервису нужно предоставить MCP-инструменты Claude Code** (агент вызывает
тулы, которые бьют в HTTP API приложения) — а не когда самому приложению нужен MCP-клиент
для внешних серверов (это другой паттерн, см. `.mcp.json`).

Примеры: агенту нужно управлять деплоем без сырого SSH (`deploy-mcp`), агенту нужны
готовые примеры полей форм без чтения исходников (`form-mcp`), агенту нужно логировать
рабочее время без ручных SQL-запросов (`studio-time-mcp`).

## Структура библиотеки

Образец — `libs/deploy-mcp/src/`:

```
libs/<name>-mcp/src/
├── cli.ts       # stdio entry point — создаёт сервер, коннектит StdioServerTransport
├── server.ts    # McpServer + server.tool(...) на каждый инструмент
├── client.ts    # тонкий HTTP-клиент к целевому приложению/сервису
├── config.ts    # чтение токена/URL/портов из env, .env.docker, SOPS
└── index.ts     # экспорт createXxxMcpServer для тестов
```

### cli.ts

```typescript
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createDeployMcpServer } from './server.js'

const server = createDeployMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
```

### server.ts

Один `server.tool(name, description, zodShape, handler)` на инструмент. `client.ts` инкапсулирует
транспорт до целевого сервиса (у `deploy-mcp` — SSH-туннель + Bearer-токен к dashboard-agent),
`server.ts` только валидирует вход через zod и форматирует ответ. См. полный пример —
[libs/deploy-mcp/src/server.ts](/libs/deploy-mcp/src/server.ts).

### config.ts

Читает секреты/адреса. Правило — **никогда не хранить токены в `.mcp.json`**: `deploy-mcp`
читает `AGENT_TOKEN` из `apps/dashboard-agent/.env.docker` (или расшифровывает `.env.docker.enc`
через SOPS, если plaintext-файла нет). Парсинг самого dotenv-файла — не пиши руками, бери
`parseDotEnv` из `@letar/mcp-server-kit` (см. ниже).

## Как создать новую библиотеку

1. `nx g @letar/generators:new-lib <name>-mcp` — каркас с `tsconfig.spec.json`, `project.json`,
   `package.json`. **Не создавай структуру руками** — генератор уже сверен с актуальными
   образцами.
2. Донастрой `package.json`:
   ```json
   {
     "type": "module",
     "dependencies": {
       "@letar/mcp-server-kit": "workspace:*",
       "@modelcontextprotocol/sdk": "1.29.0",
       "zod": "4.3.6"
     }
   }
   ```
   (актуальную версию `zod` смотри в уже существующей MCP-либе — должна совпадать во всех трёх).
   `@letar/mcp-server-kit` даёт `parseDotEnv`/`text`/`errorText`/`pretty` — не копируй их заново
   в `config.ts`/`server.ts` новой библиотеки, импортируй.
3. Донастрой `project.json`:
   - тег `"type:tool"` в `tags`
   - таргет `serve`:
     ```json
     "serve": {
       "executor": "nx:run-commands",
       "options": { "command": "bunx tsx src/cli.ts", "cwd": "libs/<name>-mcp" },
       "metadata": { "description": "Run <name>-mcp MCP server via stdio", "technologies": ["mcp"] }
     }
     ```
4. Зарегистрируй в корневом `.mcp.json`:
   ```json
   "<name>-mcp": {
     "type": "stdio",
     "command": "cmd",
     "args": ["/c", "bunx", "tsx", "libs/<name>-mcp/src/cli.ts"]
   }
   ```
5. `bun install`, перезапусти Claude Code, чтобы новый MCP-сервер подхватился.

## ⚠️ Критичная ловушка — версия `@modelcontextprotocol/sdk` должна быть точным пином

`deploy-mcp` и `form-mcp` изначально были заведены с `"@modelcontextprotocol/sdk": "^1.29.0"`
(диапазон). Диапазон разрешает `bun install` выделить **отдельную свежую копию** SDK
(например 1.30.0) вместо переиспользования уже установленной в монорепо версии — а внутренняя
резолюция `zod` у этой копии SDK расходится с `zod`, который использует сама библиотека. Это
ломает перегрузки `server.tool()` с непонятной ошибкой:

```
No overload matches this call.
Argument of type 'string' is not assignable to parameter of type 'ZodRawShapeCompat'.
```

Ошибка указывает на **описание тула** (второй аргумент `server.tool(...)`), что сбивает с
толку — реальная причина не в схеме и не в тексте описания, а в расхождении версий SDK/zod
между копиями.

**Лечится точным пином без `^`:**

```json
"@modelcontextprotocol/sdk": "1.29.0"
```

Актуальную версию смотри в уже работающей библиотеке (`libs/deploy-mcp/package.json`) или через
`grep`:

```bash
grep -n '"@letar/deploy-mcp"' -A3 bun.lock | grep modelcontextprotocol
```

Затем `bun install` заново. Все три существующие MCP-либы (`deploy-mcp`, `form-mcp`,
`studio-time-mcp`) сейчас на точном пине `1.29.0` — `form-mcp` был последним с диапазоном,
починен 2026-08-06 (диагностировано через `nx typecheck @letar/form-mcp`: `No overload matches
this call ... ZodRawShapeCompat` на каждом `server.tool()`/`server.prompt()`; после точного пина
и `bun install` — зелёный). `@letar/mcp-server-kit` от этой ловушки не зависит — сам SDK не
импортирует, версию `@modelcontextprotocol/sdk` не резолвит.

## Формат ответа тула — `@letar/mcp-server-kit`

`text`/`errorText`/`pretty` и парсер dotenv (`parseDotEnv`) не пиши заново в каждой новой
MCP-либе — импортируй из `@letar/mcp-server-kit`:

```typescript
import { errorText, parseDotEnv, pretty, text } from '@letar/mcp-server-kit'
```

`deploy-mcp` и `studio-time-mcp` так и сделаны — см.
[libs/mcp-server-kit/src/lib/tool-response.ts](/libs/mcp-server-kit/src/lib/tool-response.ts) и
[libs/mcp-server-kit/src/lib/dotenv.ts](/libs/mcp-server-kit/src/lib/dotenv.ts).

Внутри `tool-response.ts` — тот же паттерн, что раньше жил локально в каждой либе:

````typescript
// Обе функции возвращают ОДНУ и ту же форму (с полем isError) БЕЗ аннотации типа —
// так вывод типов SDK-колбэка работает. Аннотация или union из двух разных форм
// ломает overload-резолюцию tool() (ZodRawShapeCompat).

export function text(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: false as boolean }
}

export function errorText(body: string) {
  return { content: [{ type: 'text' as const, text: body }], isError: true as boolean }
}

export function pretty(data: unknown): string {
  return '```json\n' + JSON.stringify(data, null, 2) + '\n```'
}
````

Причина — если явно аннотировать возвращаемый тип обработчика (или если `text`/`errorText`
возвращают структурно разные формы), TypeScript не может вывести перегрузку `server.tool()` и
падает с той же TS2769. Обе функции обязаны возвращать **одинаковую по форме** структуру
(`content` + `isError`), и тип должен выводиться, а не задаваться явно — это верно и для новых
хелперов, если когда-нибудь понадобится расширить `@letar/mcp-server-kit`.

## Диагностика TS2769 в новом туле

Если новый инструмент падает с `No overload matches this call ... ZodRawShapeCompat`:

1. **Сначала** проверь версию SDK в lockfile, а не структуру схемы:
   ```bash
   grep -n '"@letar/<name>-mcp"' -A3 bun.lock | grep modelcontextprotocol
   ```
   Если версия не совпадает точь-в-точь с другими MCP-либами монорепо (`libs/deploy-mcp`,
   `libs/studio-time-mcp`) — это причина. Пин версию, `bun install`.
2. Если версия совпадает — проверь, что используешь `text`/`errorText` из
   `@letar/mcp-server-kit`, а не локальную копию с явной аннотацией возвращаемого типа (см. выше).
3. Только если оба пункта чисты — разбирайся со структурой самой zod-схемы тула.
