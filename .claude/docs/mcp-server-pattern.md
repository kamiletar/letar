# Паттерн «тонкий локальный MCP-сервер по stdio»

⚠️ **2026-09-16: обновлено под `@modelcontextprotocol/{server,client}` v2** (миграция с
раскола `@modelcontextprotocol/sdk` v1, PLAN-INFRA-6.md §184). `server.tool()`/`.resource()`
удалены из API — только `server.registerTool()`/`.registerResource()`. Ниже везде актуальные
имена пакетов и метод; исторические детали конкретных версий (`1.29.0`, `4.6.2` и т.п.) в
разделах про пины оставлены как иллюстрация механизма — актуальную версию смотри в
`scripts/intentional-pins.json`, не здесь.

Четыре библиотеки в монорепо реализуют один и тот же архитектурный паттерн: `libs/deploy-mcp`
(эталон, деплой через dashboard-agent API), `libs/form-mcp` (справочник по полям/формам),
`libs/studio-time-mcp` (тайм-трекер studio), `libs/studio-mcp` (админка studio — клиенты,
проекты, счета). Каждая — тонкая обёртка: вся бизнес-логика остаётся снаружи (в приложении/
сервисе), библиотека только предоставляет к ней MCP-инструменты для Claude Code.

Общий для этих серверов boilerplate вынесен в `libs/mcp-server-kit`:

- парсер dotenv, формат ответа тула — см.
  [«Формат ответа тула»](#формат-ответа-тула--letarmcp-server-kit) ниже;
- `createSecretHttpClient` — fetch-обёртка с секретным заголовком, таймаутом и различением
  сетевой/JSON-ошибки от HTTP 4xx/5xx с валидным телом. `studio-mcp` и `studio-time-mcp` ходят
  в **один и тот же** studio API под разными секретами (`X-Admin-Mcp-Secret`/
  `X-Time-Mcp-Secret`) — их `client.ts` теперь тонкие обёртки над этой фабрикой (2026-08-19),
  см. [libs/mcp-server-kit/src/lib/secret-http-client.ts](/libs/mcp-server-kit/src/lib/secret-http-client.ts).
  `deploy-mcp` этот хелпер не использует — у него другой транспорт (SSH-туннель + Bearer, не
  прямой fetch с секретным заголовком).

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
├── server.ts    # McpServer + server.registerTool(...) на каждый инструмент
├── client.ts    # тонкий HTTP-клиент к целевому приложению/сервису
├── config.ts    # чтение токена/URL/портов из env, .env.docker, SOPS
└── index.ts     # экспорт createXxxMcpServer для тестов
```

### cli.ts

```typescript
#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { createDeployMcpServer } from './server.js'

const server = createDeployMcpServer()
const transport = new StdioServerTransport()
await server.connect(transport)
```

### server.ts

Один `server.registerTool(name, { description, inputSchema: z.object(zodShape) }, handler)` на
инструмент. `client.ts` инкапсулирует
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
       "@modelcontextprotocol/server": "2.0.0",
       "zod": "4.6.5"
     }
   }
   ```
   (актуальную версию обоих пинов смотри в уже существующей MCP-либе или в
   `scripts/intentional-pins.json` — должна совпадать во всех потребителях). Добавь
   `@modelcontextprotocol/client` в `devDependencies` (той же точной версией) только если
   `server.spec.ts` импортирует `Client`/`InMemoryTransport` для тестов через
   `@letar/mcp-test-kit` — иначе он не нужен.
   `@letar/mcp-server-kit` даёт `parseDotEnv`/`text`/`errorText`/`pretty`/`createSecretHttpClient`
   — не копируй их заново в `config.ts`/`client.ts`/`server.ts` новой библиотеки, импортируй.
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

## ⚠️ Критичная ловушка — версия `@modelcontextprotocol/{server,client}` должна быть точным пином

Диапазон (`^2.0.0`) разрешает `bun install` выделить **отдельную свежую копию** пакета вместо
переиспользования уже установленной в монорепо версии — а внутренняя резолюция `zod` у этой
копии расходится с `zod`, который использует сама библиотека. Это ломает перегрузки
`server.registerTool()` с непонятной ошибкой:

```
No overload matches this call.
Argument of type 'string' is not assignable to parameter of type 'ZodRawShapeCompat'.
```

Ошибка указывает на **описание тула**, что сбивает с толку — реальная причина не в схеме и не в
тексте описания, а в расхождении версий пакета/zod между копиями. Тот же класс проблемы (тогда —
у `@modelcontextprotocol/sdk` v1) был найден и вылечен ровно так же 2026-08-06.

**Лечится точным пином без `^`** — во всех MCP-либах монорепо (`deploy-mcp`, `form-mcp`,
`glitchtip-mcp`, `mcp-test-kit`, `studio-mcp`, `studio-time-mcp`, `umami-mcp`) и в двух
приложениях, использующих пакет напрямую без обёртки-либы (`synth`, `domwellbes`):

```json
"@modelcontextprotocol/server": "2.0.0"
```

Актуальную версию смотри в `scripts/intentional-pins.json` или через `grep`:

```bash
grep -n '"@letar/deploy-mcp"' -A3 bun.lock | grep modelcontextprotocol
```

Затем `bun install` заново. `@letar/mcp-server-kit` от этой ловушки не зависит — сам пакет не
импортирует, версию `@modelcontextprotocol/*` не резолвит.

### Пина `@modelcontextprotocol/*` недостаточно — нужен синхронный пин `zod`

Точный пин выше решает только расхождение версий **самого пакета** между копиями. Он не
защищает от второго, независимого источника той же по симптомам ошибки: любой сторонний
потребитель `zod` с более узким диапазоном (`better-auth`, `@zenstackhq/*` и т.п.) заставляет bun
выделить **отдельную вложенную копию** `zod` персонально для `@modelcontextprotocol/*` (её видно
как `"@modelcontextprotocol/server/zod"` в `bun.lock`), даже когда версия самого пакета у всех
копий синхронна. `z.string()`/`z.enum()` и т.п. из лишь БЛИЗКОЙ, но другой физической копии `zod`
не совпадают по типу с `AnySchema`/`ZodTypeAny`, которые ждёт пакет — та же by-symptom ошибка
`TS2322: Type 'ZodString' is not assignable to type 'AnySchema'` на каждом `registerTool()`.

**Лечится вторым точным пином — `"zod"` в самой либе, версией, которая совпадает с корневой**
(на 2026-09-16 — `4.6.5`, см. запись `zod` в `scripts/intentional-pins.json`):

```bash
grep -n '"@modelcontextprotocol/server/zod"' bun.lock
# должно быть пусто при совпадении версий — если непусто, вот эту версию и пинуй
```

```json
"zod": "4.6.5"
```

Эта развязка zod/пакета хрупкая по конструкции: она зависит не от версии самого пакета, а от
того, что требует zod-диапазон САМЫЙ строгий из ВСЕХ потребителей zod в графе на момент
установки — при следующем `bun update` версия под `@modelcontextprotocol/server/zod` может
снова сдвинуться, и пин опять разъедется. Проверять этой же командой при каждом
`infra:deps-update`, если он трогает `better-auth`/`zod`/сам пакет.

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
// так вывод типов колбэка работает. Аннотация или union из двух разных форм
// ломает overload-резолюцию registerTool() (ZodRawShape/StandardSchemaWithJSON).

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
возвращают структурно разные формы), TypeScript не может вывести перегрузку
`server.registerTool()` и падает с той же TS2769. Обе функции обязаны возвращать **одинаковую по форме** структуру
(`content` + `isError`), и тип должен выводиться, а не задаваться явно — это верно и для новых
хелперов, если когда-нибудь понадобится расширить `@letar/mcp-server-kit`.

## Возврат картинки, не только текста — image-content-блок

Content-массив ответа тула поддерживает смешанные `text`+`image`-элементы в одном ответе — не
только `{ type: 'text', text }`. Тянись за этим, когда у тула есть URL картинки, которую нужно,
чтобы Claude реально **увидел**, а не просто прочитал как строку. Без image-блока путь к файлу —
это просто текст в JSON-снимке; Claude видит имя файла, не содержимое, и вынужден отдельно
скачивать и `Read()`'ить его — лишний шаг, который легко забыть и который ломает поток агента,
получающего снимок в реальном времени (long-poll вида `assist_wait`/`deploy_wait`).

Образец — `apps/domwellbes/src/mcp/server.ts` (`fetchImageContent`/`withEmployeeScreenshot`,
вызывается из `screen_read` и `assist_wait`): сотрудник вставляет скриншот в чат наставника,
URL картинки попадает в JSON снимка экрана как обычное поле. Без этого паттерна наставник
(Claude) видел бы только строку с путём.

```typescript
async function fetchImageContent(
  baseUrl: string,
  imageUrl: string,
): Promise<{ type: 'image'; data: string; mimeType: string } | null> {
  try {
    const res = await fetch(`${baseUrl}${imageUrl}`)
    if (!res.ok) {
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    return { type: 'image', data: buffer.toString('base64'), mimeType: guessImageMimeType(imageUrl) }
  } catch {
    return null
  }
}
```

Докачка байтов идёт **на сервере** (внутри тула, через обычный `fetch`), не на стороне Claude —
именно это отличает картинку-которую-видно от URL-которого-не-видно. Дальше `content`-массив
ответа — обычный `text`-элемент плюс докинутый `image`-элемент рядом:

```typescript
return {
  content: [
    { type: 'text', text: JSON.stringify(snapshot, null, 2) },
    { type: 'image', data: base64, mimeType: 'image/webp' },
  ],
}
```

Возвращай `null` из фетчера и мягко деградируй до текста без картинки при сетевой ошибке
(файл удалён, таймаут) — не роняй весь ответ тула из-за недоступной картинки, снимок/текст
всё равно ценны сами по себе.

### ⚠️ Локальный stdio-процесс держит код в памяти — после правки нужен реконнект

MCP-сервер, запущенный как отдельный stdio-процесс (все либы из этого документа — именно такие),
загружает код **один раз при старте** и не перечитывает файлы на диске. Правка `server.ts` во
время уже идущей сессии не долетает до уже запущенного процесса — новый `image`-content путь
формально есть в исходниках, но вызов тула всё еще исполняет старую версию кода в памяти.
Симптом: фича «работает» по логике, но результат не меняется после правки, и это легко принять
за баг в самом коде, а не за протухший процесс.

**Фикс — переподключить MCP-сервер**, не перезапускать всю сессию Claude Code целиком:
в интерактивной сессии `/mcp` → reconnect нужного сервера. Проверяй это первым шагом, если новый
код в MCP-тул не подхватывается, прежде чем разбирать логику заново.

## Диагностика TS2769 в новом туле

Если новый инструмент падает с `No overload matches this call ... ZodRawShapeCompat`:

1. **Сначала** проверь версию `@modelcontextprotocol/server` в lockfile, а не структуру схемы:
   ```bash
   grep -n '"@letar/<name>-mcp"' -A3 bun.lock | grep modelcontextprotocol
   ```
   Если версия не совпадает точь-в-точь с другими MCP-либами монорепо (`libs/deploy-mcp`,
   `libs/studio-time-mcp`) — это причина. Пин версию, `bun install`.
2. Если версия совпадает — проверь, что используешь `text`/`errorText` из
   `@letar/mcp-server-kit`, а не локальную копию с явной аннотацией возвращаемого типа (см. выше).
3. Только если оба пункта чисты — разбирайся со структурой самой zod-схемы тула.
