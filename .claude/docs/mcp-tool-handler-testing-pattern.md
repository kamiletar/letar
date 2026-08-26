# Тестирование обработчиков MCP-инструментов

До сессии 2026-08-26 в репозитории не было эталона для тестирования самих `server.tool(...)`
колбэков MCP-серверов — соседние библиотеки (`glitchtip-mcp`, `umami-mcp`, `studio-time-mcp`)
тестируют только `config.ts`/вспомогательные функции, не вызов инструментов.

## Паттерн: настоящий MCP `Client` + `InMemoryTransport`

Не лезь в приватные поля `McpServer` (`_registeredTools` и т.п.) через рефлексию — вместо этого
поднимай реальный `Client` из `@modelcontextprotocol/sdk` и соединяй его с сервером связанным
in-memory транспортом. Это гоняет колбэк ровно так, как его вызывает настоящий MCP-клиент —
включая Zod-валидацию входных аргументов и сериализацию результата.

### Хелперы — `@letar/mcp-test-kit`, не копипаста

Три вспомогательные функции (`connectedClient`, `textOf`, `expectValidationError`) появились
дословно одинаковыми в пяти `server.spec.ts` (`studio-mcp`, `glitchtip-mcp`, `umami-mcp`,
`studio-time-mcp`, `form-mcp`) — вынесены в `@letar/mcp-test-kit` (2026-08-26). Подключение —
`devDependencies` (`workspace:*`) + `bun install`, не прод-зависимость.

```typescript
import { connectedClient, expectValidationError, textOf } from '@letar/mcp-test-kit'

import { createYourMcpServer } from './server.js'

function connect() {
  return connectedClient(createYourMcpServer)
}

const { client } = await connect()
const result = await client.callTool({ name: 'tool_name', arguments: { id: 'x' } })
```

`connectedClient` принимает фабрику сервера параметром — не завязана на конкретную сигнатуру
`create*McpServer`. У `form-mcp` фабрика принимает аргумент (`{ docsPath }`), поэтому вызов
оборачивается в замыкание: `() => createFormMcpServer({ docsPath })`.

Эталон использования — [libs/studio-mcp/src/server.spec.ts](/libs/studio-mcp/src/server.spec.ts):
внешний HTTP-вызов (`studioAdminRequest`) мокается через `vi.mock`, а сам инструмент вызывается
через `client.callTool` — проверяются и happy path, и ошибки валидации, и ошибки внешнего API.
Реализация хелперов и их собственные тесты — [libs/mcp-test-kit](/libs/mcp-test-kit/README.md).

## ⚠️ Невалидные аргументы — `isError: true`, не `throw`

Интуитивно ожидаешь, что вызов инструмента с аргументами, не проходящими его Zod-схему, бросит
исключение. На деле MCP `Client` оборачивает protocol-ошибку валидации в обычный
`CallToolResult` с `isError: true` и текстом вида `Input validation error: ...` — `await
client.callTool(...)` не бросает, а возвращает объект. `expectValidationError` из
`@letar/mcp-test-kit` инкапсулирует эту проверку.

Та же форма (`isError: true` в `CallToolResult`) используется инструментами и для доменных
ошибок (404, конфликт, ошибка внешнего API) — отличить «невалидные аргументы» от «валидные
аргументы, но обработчик вернул ошибку» можно только по тексту, не по факту throw/no-throw.
