# @letar/mcp-test-kit

Общие тестовые хелперы для vitest-тестов, вызывающих `server.tool(...)`-обработчики MCP-серверов
через настоящий MCP `Client` + `InMemoryTransport` (не рефлексию по приватным полям `McpServer`).

Паттерн и его особенности (в т.ч. почему невалидные аргументы дают `isError: true`, а не `throw`)
описаны в [.claude/docs/mcp-tool-handler-testing-pattern.md](/.claude/docs/mcp-tool-handler-testing-pattern.md).

## Установка

Библиотека — тестовый хелпер, подключается через `devDependencies`:

```json
{
  "devDependencies": {
    "@letar/mcp-test-kit": "workspace:*"
  }
}
```

## API

### `connectedClient(createServer: () => McpServer)`

Поднимает переданный MCP-сервер и подключённого к нему клиента через связанный in-memory
транспорт. Фабрика сервера передаётся параметром — библиотека не завязана на конкретный
`create*McpServer`:

```typescript
import { connectedClient } from '@letar/mcp-test-kit'
import { createStudioAdminMcpServer } from './server.js'

const { client, server } = await connectedClient(createStudioAdminMcpServer)
const result = await client.callTool({ name: 'studio_client_list', arguments: {} })
```

### `textOf(result: unknown)`

Склеивает текстовые части `CallToolResult.content` в одну строку.

### `expectValidationError(client, name, args)`

Проверяет, что вызов с невалидными аргументами вернул `isError: true` и текст, содержащий
`Input validation error` — а не бросил исключение.

## Команды

```bash
nx test mcp-test-kit
nx lint mcp-test-kit
nx typecheck:tsgo mcp-test-kit
```

## Подключение к приложению

Обязательное — одно: добавь `@letar/mcp-test-kit` в `devDependencies` библиотеки-потребителя
(`workspace:*`) и прогони `bun install`. Это ребро графа Nx; сам импорт `@letar/mcp-test-kit`
резолвится и без дополнительных настроек `tsconfig.json`.

Подробнее — [libs.md](/.claude/rules/libs.md#подключение-к-приложению).
