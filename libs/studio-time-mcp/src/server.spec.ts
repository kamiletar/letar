import { connectedClient as connectMcp, expectValidationError, textOf } from '@letar/mcp-test-kit'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { studioTimeRequestMock } = vi.hoisted(() => ({ studioTimeRequestMock: vi.fn() }))

vi.mock('./client.js', () => ({
  studioTimeRequest: studioTimeRequestMock,
}))

import { createStudioTimeMcpServer, defaultSessionRef } from './server.js'

function connectedClient() {
  return connectMcp(createStudioTimeMcpServer)
}

describe('createStudioTimeMcpServer', () => {
  let client: Client

  beforeEach(async () => {
    ;({ client } = await connectedClient())
  })

  afterEach(() => {
    studioTimeRequestMock.mockReset()
  })

  describe('time_start', () => {
    it('ошибка валидации — отсутствует обязательный app', async () => {
      await expectValidationError(client, 'time_start', { description: 'делаю фичу' })
      expect(studioTimeRequestMock).not.toHaveBeenCalled()
    })

    it('успешный вызов стартует таймер', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 't1' } } })

      const result = await client.callTool({
        name: 'time_start',
        arguments: { app: 'svoichuzhie', description: 'делаю фичу' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Таймер запущен')
      expect(studioTimeRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/time/start',
        body: expect.objectContaining({ app: 'svoichuzhie', description: 'делаю фичу' }),
      })
    })

    it('ошибка внешнего вызова (ok:false) возвращает isError', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: false, status: 404, json: { error: 'проект не найден' } })

      const result = await client.callTool({
        name: 'time_start',
        arguments: { app: 'unknown-app', description: 'делаю фичу' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('проект не найден')
    })
  })

  describe('time_stop', () => {
    it('успешный вызов останавливает таймер', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 't1' } } })

      const result = await client.callTool({ name: 'time_stop', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Таймер остановлен')
    })

    it('нет активного таймера — читаемое сообщение, не ошибка', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: null } })

      const result = await client.callTool({ name: 'time_stop', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Активного таймера не было')
    })

    it('ошибка внешнего вызова возвращает isError', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: false, status: 500, json: { error: 'boom' } })

      const result = await client.callTool({ name: 'time_stop', arguments: {} })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('boom')
    })
  })

  describe('time_log', () => {
    it('ошибка валидации — minutes превышает суточный лимит', async () => {
      await expectValidationError(client, 'time_log', {
        app: 'svoichuzhie',
        minutes: 24 * 60 + 1,
        description: 'созвон',
      })
      expect(studioTimeRequestMock).not.toHaveBeenCalled()
    })

    it('успешный вызов записывает время задним числом', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 't2' } } })

      const result = await client.callTool({
        name: 'time_log',
        arguments: { app: 'svoichuzhie', minutes: 30, description: 'созвон с клиентом' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Записано задним числом')
      expect(studioTimeRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/time/log',
        body: expect.objectContaining({ app: 'svoichuzhie', minutes: 30, description: 'созвон с клиентом' }),
      })
    })
  })

  describe('time_status', () => {
    it('таймер не идёт — читаемое сообщение', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: null } })

      const result = await client.callTool({ name: 'time_status', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Таймер сейчас не идёт')
    })

    it('успешный вызов возвращает статус активного таймера', async () => {
      studioTimeRequestMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: { data: { app: 'svoichuzhie', description: 'делаю фичу' } },
      })

      const result = await client.callTool({ name: 'time_status', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('svoichuzhie')
      expect(studioTimeRequestMock).toHaveBeenCalledWith({
        path: '/api/mcp/time/status',
        query: { sessionRef: expect.any(String) },
      })
    })
  })

  describe('time_discard', () => {
    it('успешный вызов помечает запись небиллируемой', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 't3' } } })

      const result = await client.callTool({ name: 'time_discard', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('небиллируемой')
      expect(studioTimeRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/time/discard',
        body: { sessionRef: expect.any(String) },
      })
    })

    it('ошибка внешнего вызова возвращает isError', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: false, status: 500, json: { error: 'boom' } })

      const result = await client.callTool({ name: 'time_discard', arguments: {} })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('boom')
    })
  })

  describe('time_fix_internal_billable', () => {
    it('успешный вызов без аргументов выполняет правку', async () => {
      studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { fixed: 3 } } })

      const result = await client.callTool({ name: 'time_fix_internal_billable', arguments: {} })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('Правка billable-статуса выполнена')
      expect(studioTimeRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/time/fix-internal-billable',
      })
    })
  })
})

describe('defaultSessionRef', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env['CLAUDE_CODE_SESSION_ID']
  })

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env['CLAUDE_CODE_SESSION_ID']
    } else {
      process.env['CLAUDE_CODE_SESSION_ID'] = originalEnv
    }
  })

  it('берёт CLAUDE_CODE_SESSION_ID из окружения, если он задан', () => {
    process.env['CLAUDE_CODE_SESSION_ID'] = 'abc-123'

    expect(defaultSessionRef()).toBe('abc-123')
  })

  it('фолбэк на PID процесса, если CLAUDE_CODE_SESSION_ID не задан', () => {
    delete process.env['CLAUDE_CODE_SESSION_ID']

    expect(defaultSessionRef()).toBe(`pid-${process.pid}`)
  })
})
