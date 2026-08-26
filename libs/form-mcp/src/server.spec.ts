import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { createFormMcpServer } from './index.js'

/**
 * У `@letar/form-mcp` нет внешнего HTTP-клиента для мока (как у studio-mcp) — сервер читает
 * локальные markdown-доки через `loadDocs(docsPath)`. Используем реальный `libs/forms/docs` —
 * тот же путь, что уже применяется в `field-registry.integration.spec.ts` и
 * `doc-field-count.integration.spec.ts`: он стабилен (часть монорепо, не внешний ресурс) и даёт
 * честную интеграционную проверку вместо fixture-каталога с придуманными данными.
 */
const docsPath = join(fileURLToPath(new URL('.', import.meta.url)), '..', '..', 'forms', 'docs')

/** Поднимает сервер и подключённого к нему клиента через связанный in-memory транспорт. */
async function connectedClient() {
  const server = createFormMcpServer({ docsPath })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  await Promise.all([client.connect(clientTransport), server.connect(serverTransport)])
  return { client, server }
}

function textOf(result: unknown) {
  const content = (result as { content: Array<{ type: string; text?: string }> }).content
  return content.map((c) => c.text).join('\n')
}

/** Невалидные аргументы — MCP-клиент оборачивает protocol-ошибку в isError-результат, не throw. */
async function expectValidationError(client: Client, name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args })
  expect(result.isError).toBe(true)
  expect(textOf(result)).toContain('Input validation error')
}

describe('createFormMcpServer', () => {
  describe('list_fields', () => {
    it('без фильтра возвращает список всех полей из fields.md', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'list_fields', arguments: {} })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result)) as Array<{ name: string; fullName: string }>
      expect(parsed.length).toBeGreaterThan(0)
      expect(parsed.some((f) => f.name === 'String')).toBe(true)
    })

    it('с фильтром по категории возвращает только поля этой категории', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'list_fields', arguments: { category: 'text' } })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result)) as Array<{ category: string }>
      expect(parsed.length).toBeGreaterThan(0)
      expect(parsed.every((f) => f.category === 'text')).toBe(true)
    })
  })

  describe('get_field_props', () => {
    it('успешный вызов возвращает описание существующего поля', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'get_field_props', arguments: { fieldType: 'String' } })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result)) as { name: string; fullName: string }
      expect(parsed.name).toBe('String')
      expect(parsed.fullName).toBe('Form.Field.String')
    })

    it('несуществующее поле — доменная ошибка isError, не Zod-валидация', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({
        name: 'get_field_props',
        arguments: { fieldType: 'НесуществующееПоле' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('not found')
      expect(textOf(result)).not.toContain('Input validation error')
    })
  })

  describe('get_field_example', () => {
    it('успешный вызов возвращает пример кода для существующего поля', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'get_field_example', arguments: { fieldType: 'String' } })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Form.Field.String')
    })
  })

  describe('get_directives', () => {
    it('без аргументов возвращает все директивы @form.*', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'get_directives', arguments: {} })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(textOf(result))
      expect(Array.isArray(parsed)).toBe(true)
    })
  })

  describe('get_form_pattern', () => {
    it('успешный вызов возвращает известный паттерн', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'get_form_pattern', arguments: { pattern: 'crud-create' } })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('CRUD')
    })

    it('неизвестный паттерн — доменная ошибка isError со списком доступных', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({ name: 'get_form_pattern', arguments: { pattern: 'no-such-pattern' } })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('not found')
    })
  })

  describe('generate_form', () => {
    it('успешный вызов генерирует код формы по описанию полей', async () => {
      const { client } = await connectedClient()

      const result = await client.callTool({
        name: 'generate_form',
        arguments: {
          fields: [{ name: 'email', type: 'String', label: 'Email', required: true }],
          formName: 'ContactForm',
        },
      })

      expect(result.isError).toBeFalsy()
      const code = textOf(result)
      expect(code).toContain('ContactForm')
      expect(code).toContain('Form.Field.String')
    })

    it('ошибка валидации — отсутствует обязательное поле fields', async () => {
      const { client } = await connectedClient()

      await expectValidationError(client, 'generate_form', { formName: 'ContactForm' })
    })
  })
})
