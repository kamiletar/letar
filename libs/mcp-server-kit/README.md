# @letar/mcp-server-kit

Общий код для «тонких локальных MCP-серверов по stdio» (`libs/deploy-mcp`, `libs/studio-time-mcp`
и аналогичных) — см. `.claude/docs/mcp-server-pattern.md`.

## Установка

Библиотека уже включена в монорепозиторий.

```typescript
import { errorText, parseDotEnv, pretty, text } from '@letar/mcp-server-kit'
```

## API

### `parseDotEnv(content: string): Record<string, string>`

Парсит dotenv-содержимое в объект: построчный разбор `KEY=value`, снятие кавычек, пропуск
комментариев (`#`) и пустых строк.

### `text(body: string)` / `errorText(body: string)`

Оборачивают строку в MCP text-content-ответ тула (`content: [{ type: 'text', text }], isError }`).
`text` — успешный ответ (`isError: false`), `errorText` — ошибка (`isError: true`). Обе функции
**намеренно без явной аннотации возвращаемого типа** — иначе ломается overload-резолюция
`server.tool()` из `@modelcontextprotocol/sdk` (`ZodRawShapeCompat`), см. подробности в
`.claude/docs/mcp-server-pattern.md`.

### `pretty(data: unknown): string`

Форматирует данные как markdown-блок `` ```json ... ``` `` для вывода в чат.

### `createSecretHttpClient(options): (request) => Promise<{ ok, status, json }>`

Фабрика fetch-клиента к сервису, защищённому секретным HTTP-заголовком (образец —
`libs/studio-mcp`/`libs/studio-time-mcp`, оба ходят в studio API под разными секретами).

```typescript
const request = createSecretHttpClient({
  baseUrl: studioUrl, // () => string — ленивое чтение (env/файл)
  secretHeaderName: 'X-Admin-Mcp-Secret',
  secret: adminMcpSecret, // () => string — может бросать при отсутствии конфигурации
  serviceLabel: 'studio', // опционально — для текста ошибок
})

const { ok, status, json } = await request({ method: 'POST', path: '/api/mcp/admin/clients', body })
```

Таймаут (`AbortSignal.timeout`, по умолчанию 15с, переопределяется и на уровне клиента, и на
уровне отдельного запроса) и различение сетевой/JSON-parse ошибки (throw) от HTTP 4xx/5xx с
валидным JSON-телом (`{ ok: false, ... }`) — общие для всех клиентов на этой фабрике.

## Команды

```bash
nx test mcp-server-kit
nx lint mcp-server-kit
nx typecheck:tsgo mcp-server-kit
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/mcp-server-kit` в `nx.implicitDependencies` в `package.json`
приложения (если библиотеки нет в его `dependencies`). Это ребро графа Nx; сам импорт
`@letar/mcp-server-kit` резолвится и без настроек приложения.

Когда дополнительно нужны `paths` в его `tsconfig.json` и почему `nx sync` здесь не поможет —
[libs.md](/.claude/rules/libs.md#подключение-к-приложению).
