import { connectedClient as connectMcp, expectValidationError, textOf } from '@letar/mcp-test-kit'
import type { Client } from '@modelcontextprotocol/client'
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

    it('startedAt/endedAt уходят в studio как есть, ответ показывает реальный интервал в МСК', async () => {
      studioTimeRequestMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: {
          data: {
            id: 't2',
            startedAt: '2026-09-23T18:06:00.000Z',
            endedAt: '2026-09-23T19:29:00.000Z',
            durationSec: 83 * 60,
          },
          warning: null,
        },
      })

      const result = await client.callTool({
        name: 'time_log',
        arguments: {
          app: 'studio',
          startedAt: '2026-09-23T21:06',
          endedAt: '2026-09-23T22:29',
          description: 'созвон',
          kind: 'MEETING',
        },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('23.09, 21:06–23.09, 22:29 МСК (83 мин)')
      expect(textOf(result)).not.toContain('⚠️')
      expect(studioTimeRequestMock).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/mcp/time/log',
        body: expect.objectContaining({
          startedAt: '2026-09-23T21:06',
          endedAt: '2026-09-23T22:29',
          minutes: undefined,
        }),
      })
    })

    it('пересечение с другой записью — предупреждение в ответе, не ошибка', async () => {
      studioTimeRequestMock.mockResolvedValue({
        ok: true,
        status: 200,
        json: {
          data: { id: 't2', startedAt: '2026-09-23T18:19:00.000Z', endedAt: '2026-09-23T19:42:00.000Z' },
          warning: 'Интервал пересекается с другими записями (МСК): studio 23.09, 22:30–идёт',
        },
      })

      const result = await client.callTool({
        name: 'time_log',
        arguments: { app: 'studio', minutes: 83, description: 'созвон' },
      })

      expect(result.isError).toBeFalsy()
      expect(textOf(result)).toContain('⚠️ Интервал пересекается')
    })

    it('отказ studio по интервалу (400) — isError с причиной', async () => {
      studioTimeRequestMock.mockResolvedValue({
        ok: false,
        status: 400,
        json: { error: 'Конец записи (23.09, 23:00 МСК) в будущем' },
      })

      const result = await client.callTool({
        name: 'time_log',
        arguments: { app: 'studio', startedAt: '2026-09-23T22:00', endedAt: '2026-09-23T23:00', description: 'x' },
      })

      expect(result.isError).toBe(true)
      expect(textOf(result)).toContain('в будущем')
    })

    it.each([
      ['дата без времени', '2026-09-23'],
      ['русский формат', '23.09.2026 21:06'],
      ['только время', '21:06'],
    ])('ошибка валидации — startedAt не ISO-8601 (%s), без запроса в studio', async (_, startedAt) => {
      await expectValidationError(client, 'time_log', { app: 'studio', startedAt, minutes: 10, description: 'x' })
      expect(studioTimeRequestMock).not.toHaveBeenCalled()
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

// zod по умолчанию молча отбрасывает неизвестные ключи. Для тайм-трекера это тихая порча учёта:
// опечатка в `stage`/`kind`/`sessionRef` пишет время без этапа, с типом WORK или в таймер другой
// сессии. Схемы строгие: лишний ключ — ошибка валидации, запрос в studio не уходит.
// `time_fix_internal_billable` без аргументов не затрагивается.
describe('строгие входные схемы — неизвестный аргумент отвергается', () => {
  const cases: Array<[tool: string, args: Record<string, unknown>]> = [
    ['time_start', { app: 'svoichuzhie', description: 'делаю фичу', stage: 'Каталог' }],
    ['time_switch', { app: 'svoichuzhie', description: 'делаю фичу', kind: 'MEETING' }],
    ['time_stop', { sessionRef: 's1' }],
    ['time_pause', { sessionRef: 's1' }],
    ['time_resume', { sessionRef: 's1' }],
    ['time_discard', { sessionRef: 's1' }],
    ['time_note', { description: 'уточнение', sessionRef: 's1' }],
    ['time_status', { sessionRef: 's1' }],
    ['time_log', { app: 'svoichuzhie', minutes: 30, description: 'созвон', kind: 'MEETING' }],
    ['time_log', {
      app: 'svoichuzhie',
      startedAt: '2026-09-23T21:06',
      endedAt: '2026-09-23T22:29',
      description: 'созвон',
    }],
    ['time_stage_close', { app: 'svoichuzhie', stage: 'Каталог' }],
  ]

  beforeEach(() => {
    studioTimeRequestMock.mockReset()
    studioTimeRequestMock.mockResolvedValue({ ok: true, status: 200, json: { data: { id: 't1' } } })
  })

  it.each(cases)('%s: валидный вызов проходит', async (tool, args) => {
    const { client } = await connectedClient()
    const result = await client.callTool({ name: tool, arguments: args })
    expect(textOf(result)).not.toContain('Input validation error')
    expect(studioTimeRequestMock).toHaveBeenCalledTimes(1)
  })

  it.each(cases)('%s: лишний ключ даёт ошибку валидации без запроса в studio', async (tool, args) => {
    const { client } = await connectedClient()
    await expectValidationError(client, tool, { ...args, unknownArg: 'x' })
    expect(studioTimeRequestMock).not.toHaveBeenCalled()
  })

  it('time_start: `session_ref` вместо `sessionRef` не открывает таймер в сессии по умолчанию', async () => {
    const { client } = await connectedClient()
    await expectValidationError(client, 'time_start', {
      app: 'svoichuzhie',
      description: 'делаю фичу',
      session_ref: 'other',
    })
    expect(studioTimeRequestMock).not.toHaveBeenCalled()
  })
})
