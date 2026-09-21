/**
 * Тесты прямой проверки TLS-сертификата. Сеть замокана (`node:tls`): нужен не настоящий
 * сертификат, а поведение вокруг него — что считается сроком, что ошибкой, и что проверка не
 * зависает на молчащем сервере (именно зависание/тишина и стоили нам истёкший сертификат почты).
 */

import { EventEmitter } from 'node:events'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type ConnectCallback = () => void

const connect = vi.fn()

vi.mock('node:tls', () => ({
  default: { connect: (...args: unknown[]) => connect(...args) },
}))

const { DEFAULT_TLS_TARGETS, daysUntil, parseTlsTargets, probeCertificate } = await import('./tls-cert-probe')

/** Фальшивый сокет: сам не ходит в сеть, поведение задаёт тест */
function fakeSocket(cert: { valid_to?: string } | null) {
  const socket = new EventEmitter() as EventEmitter & {
    getPeerCertificate: () => unknown
    setTimeout: (ms: number, cb: () => void) => void
    destroy: ReturnType<typeof vi.fn>
    fireTimeout?: () => void
  }
  socket.getPeerCertificate = () => cert
  socket.setTimeout = (_ms, cb) => {
    socket.fireTimeout = cb
  }
  socket.destroy = vi.fn()
  return socket
}

const NOW = new Date('2026-09-21T12:00:00Z')

beforeEach(() => {
  connect.mockReset()
})

describe('parseTlsTargets', () => {
  it('без env берёт цели по умолчанию — оба порта Maddy', () => {
    expect(parseTlsTargets(undefined)).toEqual([
      { host: 'mail.letar.best', port: 993 },
      { host: 'mail.letar.best', port: 465 },
    ])
    expect(parseTlsTargets('   ')).toEqual(parseTlsTargets(DEFAULT_TLS_TARGETS))
  })

  it('разбирает список и отбрасывает мусор, не роняя остальное', () => {
    expect(parseTlsTargets('a.example:443, b.example:8443,,:80,c.example,d.example:99999,e.example:x')).toEqual([
      { host: 'a.example', port: 443 },
      { host: 'b.example', port: 8443 },
    ])
  })
})

describe('daysUntil', () => {
  it('считает сутки вверх: «сегодня» — 0, «вчера» — отрицательное', () => {
    expect(daysUntil(new Date('2026-09-21T18:00:00Z'), NOW)).toBe(1)
    expect(daysUntil(new Date('2026-09-21T12:00:00Z'), NOW)).toBe(0)
    expect(daysUntil(new Date('2026-09-20T12:58:21Z'), NOW)).toBe(-1)
    expect(daysUntil(new Date('2026-12-20T17:01:38Z'), NOW)).toBe(91)
  })
})

describe('probeCertificate', () => {
  it('читает срок сертификата, который отдал сервер', async () => {
    const socket = fakeSocket({ valid_to: 'Dec 20 17:01:38 2026 GMT' })
    connect.mockImplementation((_options: unknown, cb: ConnectCallback) => {
      queueMicrotask(cb)
      return socket
    })

    const result = await probeCertificate({ host: 'mail.letar.best', port: 993 }, { now: NOW })

    expect(result).toMatchObject({ target: 'mail.letar.best:993', daysUntilExpiry: 91 })
    expect(result.error).toBeUndefined()
    expect(socket.destroy).toHaveBeenCalled()
  })

  it('читает и УЖЕ истёкший сертификат — для этого проверка цепочки отключена', async () => {
    const socket = fakeSocket({ valid_to: 'Sep 20 12:58:21 2026 GMT' })
    connect.mockImplementation((_options: unknown, cb: ConnectCallback) => {
      queueMicrotask(cb)
      return socket
    })

    const result = await probeCertificate({ host: 'mail.letar.best', port: 465 }, { now: NOW })

    expect(result.daysUntilExpiry).toBe(-1)
    expect(connect.mock.calls[0]![0]).toMatchObject({
      host: 'mail.letar.best',
      port: 465,
      servername: 'mail.letar.best',
      rejectUnauthorized: false,
    })
  })

  it('сервер не отдал сертификат — это ошибка, а не «всё хорошо»', async () => {
    const socket = fakeSocket({})
    connect.mockImplementation((_options: unknown, cb: ConnectCallback) => {
      queueMicrotask(cb)
      return socket
    })

    const result = await probeCertificate({ host: 'h', port: 1 }, { now: NOW })

    expect(result.daysUntilExpiry).toBeNull()
    expect(result.error).toMatch(/не отдал сертификат/)
  })

  it('нечитаемая дата срока — тоже ошибка', async () => {
    const socket = fakeSocket({ valid_to: 'не дата' })
    connect.mockImplementation((_options: unknown, cb: ConnectCallback) => {
      queueMicrotask(cb)
      return socket
    })

    const result = await probeCertificate({ host: 'h', port: 1 }, { now: NOW })

    expect(result.error).toBeDefined()
  })

  it('ошибка соединения возвращается значением, а не бросается', async () => {
    const socket = fakeSocket(null)
    connect.mockImplementation(() => {
      queueMicrotask(() => socket.emit('error', new Error('connect ECONNREFUSED')))
      return socket
    })

    const result = await probeCertificate({ host: 'h', port: 1 }, { now: NOW })

    expect(result).toMatchObject({ target: 'h:1', validTo: null, daysUntilExpiry: null })
    expect(result.error).toBe('connect ECONNREFUSED')
  })

  it('молчащий сервер не вешает проверку — срабатывает таймаут', async () => {
    const socket = fakeSocket(null)
    connect.mockImplementation(() => {
      queueMicrotask(() => socket.fireTimeout?.())
      return socket
    })

    const result = await probeCertificate({ host: 'h', port: 1 }, { timeoutMs: 5, now: NOW })

    expect(result.error).toMatch(/таймаут 5 мс/)
    expect(socket.destroy).toHaveBeenCalled()
  })

  it('результат фиксируется один раз: ошибка после успеха его не портит', async () => {
    const socket = fakeSocket({ valid_to: 'Dec 20 17:01:38 2026 GMT' })
    connect.mockImplementation((_options: unknown, cb: ConnectCallback) => {
      queueMicrotask(() => {
        cb()
        socket.emit('error', new Error('позднее закрытие'))
      })
      return socket
    })

    const result = await probeCertificate({ host: 'h', port: 1 }, { now: NOW })

    expect(result.error).toBeUndefined()
    expect(result.daysUntilExpiry).toBe(91)
  })
})
