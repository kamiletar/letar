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

## Команды

```bash
nx test mcp-server-kit
nx lint mcp-server-kit
nx typecheck:tsgo mcp-server-kit
```

## Подключение к приложению

В `tsconfig.json` приложения:

```json
{
  "compilerOptions": {
    "paths": {
      "@letar/mcp-server-kit": ["../../libs/mcp-server-kit/src/index.ts"]
    }
  },
  "references": [{ "path": "../../libs/mcp-server-kit" }]
}
```

Затем добавь `mcp-server-kit` в `implicitDependencies` `package.json` приложения — это
единственное обязательное. `paths`/`references` выше вспомогательные, а `nx sync` их не обновит:
генератор `@nx/js:typescript-sync` в репо отключён (см.
[environment.md](/.claude/docs/environment.md#разработка-shared-библиотек)).
