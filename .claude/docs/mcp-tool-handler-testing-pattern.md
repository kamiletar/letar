# Тестирование обработчиков MCP-инструментов

До сессии 2026-08-26 в репозитории не было эталона для тестирования самих `server.tool(...)`
колбэков MCP-серверов — соседние библиотеки (`glitchtip-mcp`, `umami-mcp`, `studio-time-mcp`)
тестируют только `config.ts`/вспомогательные функции, не вызов инструментов.

## Паттерн: настоящий MCP `Client` + `InMemoryTransport`

Не лезь в приватные поля `McpServer` (`_registeredTools` и т.п.) через рефлексию — вместо этого
поднимай реальный `Client` из `@modelcontextprotocol/sdk` и соединяй его с сервером связанным
in-memory транспортом. Это гоняет колбэк ровно так, как его вызывает настоящий MCP-клиент —
включая Zod-валидацию входных аргументов и сериализацию результата.

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'

async function connectedClient() {
  const server = createYourMcpServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return { client, server }
}

const { client } = await connectedClient()
const result = await client.callTool({ name: 'tool_name', arguments: { id: 'x' } })
```

Эталон — [libs/studio-mcp/src/server.spec.ts](/libs/studio-mcp/src/server.spec.ts): внешний
HTTP-вызов (`studioAdminRequest`) мокается через `vi.mock`, а сам инструмент вызывается через
`client.callTool` — проверяются и happy path, и ошибки валидации, и ошибки внешнего API.

## ⚠️ Невалидные аргументы — `isError: true`, не `throw`

Интуитивно ожидаешь, что вызов инструмента с аргументами, не проходящими его Zod-схему, бросит
исключение. На деле MCP `Client` оборачивает protocol-ошибку валидации в обычный
`CallToolResult` с `isError: true` и текстом вида `Input validation error: ...` — `await
client.callTool(...)` не бросает, а возвращает объект.

```typescript
async function expectValidationError(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args })
  expect(result.isError).toBe(true)
  expect(textOf(result)).toContain('Input validation error')
}
```

Та же форма (`isError: true` в `CallToolResult`) используется инструментами и для доменных
ошибок (404, конфликт, ошибка внешнего API) — отличить «невалидные аргументы» от «валидные
аргументы, но обработчик вернул ошибку» можно только по тексту, не по факту throw/no-throw.
