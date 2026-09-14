import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVerificationStreamRoute } from './route'
import { createVerificationStreamToken } from './stream-token'

const SECRET = 'route-test-secret'

function makeRequest(cookieValue?: string): Request {
  const headers = new Headers()
  if (cookieValue) {
    headers.set('cookie', `letar.verification_stream=${encodeURIComponent(cookieValue)}`)
  }
  return new Request('http://localhost/api/auth/verification-stream', { headers })
}

describe('createVerificationStreamRoute', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('без cookie → 401', async () => {
    const { GET } = createVerificationStreamRoute({ secret: SECRET, isEmailVerified: vi.fn() })
    const response = await GET(makeRequest())
    expect(response.status).toBe(401)
  })

  it('невалидный токен → 401', async () => {
    const { GET } = createVerificationStreamRoute({ secret: SECRET, isEmailVerified: vi.fn() })
    const response = await GET(makeRequest('garbage'))
    expect(response.status).toBe(401)
  })

  it('уже подтверждён → одно событие, без стрима', async () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    const isEmailVerified = vi.fn().mockResolvedValue(true)
    const { GET } = createVerificationStreamRoute({ secret: SECRET, isEmailVerified })
    const response = await GET(makeRequest(token))

    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toContain('"verified":true')
    expect(isEmailVerified).toHaveBeenCalledWith('user@example.com')
  })

  it('верифицируется на третьем опросе → событие и закрытие', async () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    let call = 0
    const isEmailVerified = vi.fn().mockImplementation(async () => {
      call += 1
      return call >= 3
    })
    const { GET } = createVerificationStreamRoute({ secret: SECRET, isEmailVerified, pollMs: 1000 })
    const response = await GET(makeRequest(token))
    expect(response.status).toBe(200)

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    await reader.read() // ": connected\n\n"

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(1000)
    }

    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(decoder.decode(value)).toContain('"verified":true')

    const final = await reader.read()
    expect(final.done).toBe(true)
    expect(isEmailVerified).toHaveBeenCalledTimes(3)
  })

  it('heartbeat уходит по таймеру', async () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    const { GET } = createVerificationStreamRoute({
      secret: SECRET,
      isEmailVerified: vi.fn().mockResolvedValue(false),
      heartbeatMs: 5000,
      pollMs: 100000,
    })
    const response = await GET(makeRequest(token))
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    await reader.read() // connected

    await vi.advanceTimersByTimeAsync(5000)
    const { value } = await reader.read()
    expect(decoder.decode(value)).toContain('heartbeat')
  })

  it('таймаут закрывает поток', async () => {
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    const { GET } = createVerificationStreamRoute({
      secret: SECRET,
      isEmailVerified: vi.fn().mockResolvedValue(false),
      timeoutMs: 10000,
      pollMs: 100000,
      heartbeatMs: 100000,
    })
    const response = await GET(makeRequest(token))
    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    await reader.read() // connected
    await vi.advanceTimersByTimeAsync(10000)

    const { value } = await reader.read()
    expect(decoder.decode(value)).toContain('event: timeout')

    const final = await reader.read()
    expect(final.done).toBe(true)
  })

  it('abort останавливает опрос — счётчик isEmailVerified не растёт после отмены', async () => {
    const controller = new AbortController()
    const token = createVerificationStreamToken({ email: 'user@example.com', secret: SECRET })
    const isEmailVerified = vi.fn().mockResolvedValue(false)
    const { GET } = createVerificationStreamRoute({ secret: SECRET, isEmailVerified, pollMs: 1000 })

    const headers = new Headers()
    headers.set('cookie', `letar.verification_stream=${encodeURIComponent(token)}`)
    const request = new Request('http://localhost/api/auth/verification-stream', { headers, signal: controller.signal })

    const response = await GET(request)
    const reader = response.body!.getReader()
    await reader.read() // connected

    await vi.advanceTimersByTimeAsync(1000)
    const callsBeforeAbort = isEmailVerified.mock.calls.length
    expect(callsBeforeAbort).toBeGreaterThan(0)

    controller.abort()
    await vi.advanceTimersByTimeAsync(5000)

    expect(isEmailVerified.mock.calls.length).toBe(callsBeforeAbort)
  })

  it('неизвестный email (isEmailVerified всегда false) не даёт 404 — просто ждёт таймаута', async () => {
    const token = createVerificationStreamToken({ email: 'ghost@example.com', secret: SECRET })
    const { GET } = createVerificationStreamRoute({
      secret: SECRET,
      isEmailVerified: vi.fn().mockResolvedValue(false),
      timeoutMs: 5000,
      pollMs: 100000,
      heartbeatMs: 100000,
    })
    const response = await GET(makeRequest(token))
    expect(response.status).toBe(200)

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()
    await reader.read()
    await vi.advanceTimersByTimeAsync(5000)
    const { value } = await reader.read()
    expect(decoder.decode(value)).toContain('timeout')
  })
})
