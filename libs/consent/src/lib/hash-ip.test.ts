import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { hashIp } from './hash-ip'

function fakeRequest(headers: Record<string, string>): Request {
  return new Request('http://localhost/api/consent', { headers })
}

describe('hashIp', () => {
  it('хэширует первый IP из x-forwarded-for через SHA-256', () => {
    const ip = '203.0.113.7'
    const expected = createHash('sha256').update(ip).digest('hex')
    expect(hashIp(fakeRequest({ 'x-forwarded-for': ip }))).toBe(expected)
  })

  it('берёт первый адрес из списка x-forwarded-for (прокси/CDN)', () => {
    const expected = createHash('sha256').update('198.51.100.1').digest('hex')
    expect(hashIp(fakeRequest({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe(expected)
  })

  it('падает обратно на x-real-ip, если x-forwarded-for отсутствует', () => {
    const expected = createHash('sha256').update('192.0.2.55').digest('hex')
    expect(hashIp(fakeRequest({ 'x-real-ip': '192.0.2.55' }))).toBe(expected)
  })

  it('использует "unknown" если оба заголовка отсутствуют', () => {
    const expected = createHash('sha256').update('unknown').digest('hex')
    expect(hashIp(fakeRequest({}))).toBe(expected)
  })
})
