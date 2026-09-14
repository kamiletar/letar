import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPollingSseResponse } from './create-polling-sse-response'

/** Читает следующий «кадр» SSE (одно `enqueue`) и возвращает его как текст. */
async function readChunk(reader: ReadableStreamDefaultReader<Uint8Array>): Promise<string> {
  const { value, done } = await reader.read()
  if (done || !value) {
    throw new Error('Поток закрыт раньше, чем ожидалось')
  }
  return new TextDecoder().decode(value)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createPollingSseResponse', () => {
  it('отдаёт SSE-заголовки по умолчанию', () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({ request, poll: () => undefined, intervalMs: 1000 })

    expect(res.headers.get('Content-Type')).toBe('text/event-stream')
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
    expect(res.headers.get('Connection')).toBe('keep-alive')
  })

  it('позволяет переопределить/дополнить заголовки', () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({
      request,
      poll: () => undefined,
      intervalMs: 1000,
      headers: { 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no' },
    })

    expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform')
    expect(res.headers.get('X-Accel-Buffering')).toBe('no')
  })

  it('опрашивает по интервалу и не раньше первого тика без runPollImmediately', async () => {
    const poll = vi.fn().mockReturnValue(undefined)
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({ request, poll, intervalMs: 2000 })
    void res.body!.getReader()

    expect(poll).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(2000)
    expect(poll).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2000)
    expect(poll).toHaveBeenCalledTimes(2)
  })

  it('runPollImmediately вызывает poll сразу при открытии потока', async () => {
    const poll = vi.fn().mockReturnValue(undefined)
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({ request, poll, intervalMs: 2000, runPollImmediately: true })
    void res.body!.getReader()

    await vi.advanceTimersByTimeAsync(0)
    expect(poll).toHaveBeenCalledTimes(1)
  })

  it('emit без имени события даёт обычный `data:`-кадр', async () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({
      request,
      intervalMs: 1000,
      poll: (emit) => {
        emit({ verified: true })
      },
    })
    const reader = res.body!.getReader()

    const chunk = readChunk(reader)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await chunk).toBe(`data: ${JSON.stringify({ verified: true })}\n\n`)
  })

  it('emit с именем события даёт `event: <имя>` перед `data:`', async () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({
      request,
      intervalMs: 1000,
      poll: (emit) => {
        emit({ count: 3 }, 'unread-count')
      },
    })
    const reader = res.body!.getReader()

    const chunk = readChunk(reader)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await chunk).toBe(`event: unread-count\ndata: ${JSON.stringify({ count: 3 })}\n\n`)
  })

  it('heartbeatMs шлёт комментарий-пинг с заданной периодичностью', async () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({
      request,
      poll: () => undefined,
      intervalMs: 10_000,
      heartbeatMs: 1000,
    })
    const reader = res.body!.getReader()

    const first = readChunk(reader)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await first).toBe(': heartbeat\n\n')

    const second = readChunk(reader)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await second).toBe(': heartbeat\n\n')
  })

  it('poll, вернувший "done", закрывает поток сразу после своего emit', async () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({
      request,
      intervalMs: 1000,
      poll: (emit) => {
        emit({ reset: true })
        return 'done'
      },
    })
    const reader = res.body!.getReader()

    const chunk = readChunk(reader)
    await vi.advanceTimersByTimeAsync(1000)
    expect(await chunk).toBe(`data: ${JSON.stringify({ reset: true })}\n\n`)

    const final = await reader.read()
    expect(final.done).toBe(true)
  })

  it('timeoutMs автоматически закрывает поток без "done"', async () => {
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({
      request,
      poll: () => undefined,
      intervalMs: 60_000,
      timeoutMs: 5000,
    })
    const reader = res.body!.getReader()

    await vi.advanceTimersByTimeAsync(5000)
    const final = await reader.read()
    expect(final.done).toBe(true)
  })

  it('ошибка внутри poll не рвёт поток — опрос продолжается на следующем тике', async () => {
    const poll = vi.fn().mockRejectedValueOnce(new Error('db unavailable')).mockReturnValueOnce(undefined)
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({ request, poll, intervalMs: 1000 })
    void res.body!.getReader()

    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)

    expect(poll).toHaveBeenCalledTimes(2)
  })

  it('очищает интервалы/таймаут при отключении клиента (request.signal abort)', async () => {
    const poll = vi.fn().mockReturnValue(undefined)
    const controller = new AbortController()
    const request = new Request('http://localhost/api/sse', { signal: controller.signal })
    const res = createPollingSseResponse({
      request,
      poll,
      intervalMs: 1000,
      heartbeatMs: 1000,
      timeoutMs: 10_000,
    })
    const reader = res.body!.getReader()

    const heartbeat = readChunk(reader)
    await vi.advanceTimersByTimeAsync(1000)
    await heartbeat
    expect(poll).toHaveBeenCalledTimes(1)

    controller.abort()
    const final = await reader.read()
    expect(final.done).toBe(true)

    await vi.advanceTimersByTimeAsync(10_000)
    expect(poll).toHaveBeenCalledTimes(1)
  })

  it('cancel() потока (реакция клиента на закрытие reader) тоже останавливает опрос', async () => {
    const poll = vi.fn().mockReturnValue(undefined)
    const request = new Request('http://localhost/api/sse')
    const res = createPollingSseResponse({ request, poll, intervalMs: 1000 })
    const reader = res.body!.getReader()

    await vi.advanceTimersByTimeAsync(1000)
    expect(poll).toHaveBeenCalledTimes(1)

    await reader.cancel()
    await vi.advanceTimersByTimeAsync(5000)
    expect(poll).toHaveBeenCalledTimes(1)
  })
})
