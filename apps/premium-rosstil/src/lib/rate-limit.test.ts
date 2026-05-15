import { describe, expect, it } from 'vitest'
import { getClientIp } from './rate-limit'

/**
 * Тесты для модуля rate-limit.
 *
 * ПРИМЕЧАНИЕ: Функции checkRateLimit и resetRateLimit требуют
 * подключения к базе данных через Prisma. В Jest 30 + ESM
 * мокинг модулей работает некорректно, поэтому эти функции тестируются
 * через E2E тесты в Playwright.
 *
 * Здесь мы тестируем только чистые функции без зависимостей от БД.
 */

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '203.0.113.1, 192.168.1.1',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('should extract single IP from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '203.0.113.1',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('should trim whitespace from x-forwarded-for', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '  203.0.113.1  , 192.168.1.1',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('should fall back to x-real-ip header', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-real-ip': '203.0.113.1',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('should prefer x-forwarded-for over x-real-ip', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '203.0.113.1',
        'x-real-ip': '192.168.1.1',
      },
    })

    expect(getClientIp(request)).toBe('203.0.113.1')
  })

  it('should return "127.0.0.1" when no IP headers present', () => {
    const request = new Request('http://localhost')

    expect(getClientIp(request)).toBe('127.0.0.1')
  })

  it('should handle IPv6 addresses', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '2001:db8::1, 192.168.1.1',
      },
    })

    expect(getClientIp(request)).toBe('2001:db8::1')
  })

  it('should handle empty x-forwarded-for header', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '',
      },
    })

    // Пустая строка — falsy, fallback на 127.0.0.1
    expect(getClientIp(request)).toBe('127.0.0.1')
  })

  it('should handle x-forwarded-for with only whitespace', () => {
    const request = new Request('http://localhost', {
      headers: {
        'x-forwarded-for': '   ',
      },
    })

    // Will split and trim to empty string, then return it
    expect(getClientIp(request)).toBe('')
  })
})
