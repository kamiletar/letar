import { connectedClient as connectMcp, expectValidationError, textOf } from '@letar/mcp-test-kit'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { listWebsitesMock, findWebsiteByDomainMock, getWebsiteStatsMock, createWebsiteMock } = vi.hoisted(() => ({
  listWebsitesMock: vi.fn(),
  findWebsiteByDomainMock: vi.fn(),
  getWebsiteStatsMock: vi.fn(),
  createWebsiteMock: vi.fn(),
}))

// В отличие от studio-mcp, клиент umami-mcp не оборачивает результат в { ok, json } —
// функции клиента либо резолвятся с данными, либо бросают Error (см. client.ts:umamiRequest).
vi.mock('./client.js', () => ({
  listWebsites: listWebsitesMock,
  findWebsiteByDomain: findWebsiteByDomainMock,
  getWebsiteStats: getWebsiteStatsMock,
  createWebsite: createWebsiteMock,
}))

import { createUmamiMcpServer } from './server.js'

function connectedClient() {
  return connectMcp(createUmamiMcpServer)
}

describe('createUmamiMcpServer', () => {
  let client: Client

  beforeEach(async () => {
    ;({ client } = await connectedClient())
  })

  afterEach(() => {
    listWebsitesMock.mockReset()
    findWebsiteByDomainMock.mockReset()
    getWebsiteStatsMock.mockReset()
    createWebsiteMock.mockReset()
  })

  describe('umami_list_websites', () => {
    it('успешный вызов возвращает список сайтов', async () => {
      listWebsitesMock.mockResolvedValue([
        { id: 'w1', name: 'DomWellBes', domain: 'domwellbes.ru' },
        { id: 'w2', name: 'Aboi', domain: 'neyroaboi.ru' },
      ])

      const result = await client.callTool({ name: 'umami_list_websites', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Сайтов в Umami: 2')
      expect(textOf(result)).toContain('domwellbes.ru')
      expect(listWebsitesMock).toHaveBeenCalledTimes(1)
    })

    it('ошибка HTTP-клиента (throw) возвращается как читаемая ошибка, не исключение', async () => {
      listWebsitesMock.mockRejectedValue(new Error('Umami API error (/api/websites): HTTP 500'))

      const result = await client.callTool({ name: 'umami_list_websites', arguments: {} })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('Umami API error')
    })
  })

  describe('umami_find_website', () => {
    it('ошибка валидации — пустой domain', async () => {
      await expectValidationError(client, 'umami_find_website', { domain: '' })
      expect(findWebsiteByDomainMock).not.toHaveBeenCalled()
    })

    it('успешный вызов находит сайт по домену', async () => {
      findWebsiteByDomainMock.mockResolvedValue({ id: 'w1', name: 'DomWellBes', domain: 'domwellbes.ru' })

      const result = await client.callTool({
        name: 'umami_find_website',
        arguments: { domain: 'domwellbes.ru' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Найден')
      expect(textOf(result)).toContain('domwellbes.ru')
      expect(findWebsiteByDomainMock).toHaveBeenCalledWith('domwellbes.ru')
    })

    it('домен не найден — читаемое сообщение, не ошибка', async () => {
      findWebsiteByDomainMock.mockResolvedValue(null)

      const result = await client.callTool({
        name: 'umami_find_website',
        arguments: { domain: 'unknown.example' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('не найден')
    })

    it('ошибка внешнего вызова (throw) возвращает isError', async () => {
      findWebsiteByDomainMock.mockRejectedValue(new Error('Umami auth failed: HTTP 401'))

      const result = await client.callTool({
        name: 'umami_find_website',
        arguments: { domain: 'domwellbes.ru' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('Umami auth failed')
    })
  })

  describe('umami_get_website_stats', () => {
    it('ошибка валидации — отсутствует обязательный websiteId', async () => {
      await expectValidationError(client, 'umami_get_website_stats', {})
      expect(getWebsiteStatsMock).not.toHaveBeenCalled()
    })

    it('успешный вызов возвращает статистику за дефолтный период (24h)', async () => {
      getWebsiteStatsMock.mockResolvedValue({
        pageviews: { value: 100, prev: 80 },
        visitors: { value: 50, prev: 40 },
        visits: { value: 60, prev: 45 },
        bounces: { value: 10, prev: 8 },
        totaltime: { value: 3600, prev: 3000 },
      })

      const result = await client.callTool({
        name: 'umami_get_website_stats',
        arguments: { websiteId: 'w1' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('24h')
      expect(textOf(result)).toContain('"value": 100')
      expect(getWebsiteStatsMock).toHaveBeenCalledWith('w1', '24h')
    })

    it('передаёт явно указанный период вместо дефолтного', async () => {
      getWebsiteStatsMock.mockResolvedValue({
        pageviews: { value: 1, prev: 1 },
        visitors: { value: 1, prev: 1 },
        visits: { value: 1, prev: 1 },
        bounces: { value: 1, prev: 1 },
        totaltime: { value: 1, prev: 1 },
      })

      await client.callTool({
        name: 'umami_get_website_stats',
        arguments: { websiteId: 'w1', period: '7d' },
      })

      expect(getWebsiteStatsMock).toHaveBeenCalledWith('w1', '7d')
    })

    it('ошибка валидации — недопустимое значение period', async () => {
      await expectValidationError(client, 'umami_get_website_stats', { websiteId: 'w1', period: '1y' })
      expect(getWebsiteStatsMock).not.toHaveBeenCalled()
    })

    it('ошибка внешнего вызова (throw) возвращает isError', async () => {
      getWebsiteStatsMock.mockRejectedValue(new Error('Umami API error (/api/websites/w1/stats): HTTP 404'))

      const result = await client.callTool({
        name: 'umami_get_website_stats',
        arguments: { websiteId: 'w1' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('HTTP 404')
    })
  })

  describe('umami_create_website', () => {
    it('ошибка валидации — пустое имя', async () => {
      await expectValidationError(client, 'umami_create_website', { name: '', domain: 'test.ru' })
      expect(createWebsiteMock).not.toHaveBeenCalled()
    })

    it('ошибка валидации — пустой domain', async () => {
      await expectValidationError(client, 'umami_create_website', { name: 'Test', domain: '' })
      expect(createWebsiteMock).not.toHaveBeenCalled()
    })

    it('успешный вызов создаёт сайт', async () => {
      createWebsiteMock.mockResolvedValue({ id: 'w3', name: 'Test', domain: 'test.ru' })

      const result = await client.callTool({
        name: 'umami_create_website',
        arguments: { name: 'Test', domain: 'test.ru' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Сайт создан')
      expect(createWebsiteMock).toHaveBeenCalledWith('Test', 'test.ru')
    })

    it('ошибка внешнего вызова (домен уже занят) возвращает isError', async () => {
      createWebsiteMock.mockRejectedValue(new Error('Umami API error (/api/websites): HTTP 400 — domain taken'))

      const result = await client.callTool({
        name: 'umami_create_website',
        arguments: { name: 'Test', domain: 'test.ru' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('domain taken')
    })
  })
})
