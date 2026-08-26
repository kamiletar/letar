import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { connectedClient, expectValidationError, textOf } from './connected-client'

function createDummyServer() {
  const server = new McpServer({ name: 'dummy', version: '0.0.0' })
  server.tool('echo', { text: z.string() }, async ({ text }) => ({
    content: [{ type: 'text', text }],
  }))
  return server
}

describe('connectedClient', () => {
  it('поднимает сервер и клиента, связанные in-memory транспортом', async () => {
    const { client } = await connectedClient(createDummyServer)

    const result = await client.callTool({ name: 'echo', arguments: { text: 'привет' } })

    expect(result.isError).toBeFalsy()
    expect(textOf(result)).toBe('привет')
  })
})

describe('expectValidationError', () => {
  it('подтверждает isError и текст ошибки при невалидных аргументах', async () => {
    const { client } = await connectedClient(createDummyServer)

    await expectValidationError(client, 'echo', {})
  })
})
