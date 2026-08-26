import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { expect } from 'vitest'

/** Поднимает переданный MCP-сервер и подключённого к нему клиента через связанный in-memory транспорт. */
export async function connectedClient(createServer: () => McpServer) {
  const server = createServer()
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return { client, server }
}

export function textOf(result: unknown) {
  const content = (result as { content: Array<{ type: string; text?: string }> }).content
  return content.map((c) => c.text).join('\n')
}

/** Невалидные аргументы — MCP-клиент оборачивает protocol-ошибку в isError-результат, не throw. */
export async function expectValidationError(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args })
  expect(result.isError).toBe(true)
  expect(textOf(result)).toContain('Input validation error')
}
