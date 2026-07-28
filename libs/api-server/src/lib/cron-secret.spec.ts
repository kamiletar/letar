import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { verifyCronSecret } from './cron-secret'

function requestWithHeader(value: string | null): Request {
  const headers = new Headers()
  if (value !== null) {
    headers.set('x-cron-secret', value)
  }
  return new Request('https://example.com/api/cron/test', { method: 'POST', headers })
}

describe('verifyCronSecret', () => {
  const originalSecret = process.env.CRON_SECRET

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it('возвращает true при совпадении заголовка и CRON_SECRET', () => {
    expect(verifyCronSecret(requestWithHeader('test-secret'))).toBe(true)
  })

  it('возвращает false при несовпадении', () => {
    expect(verifyCronSecret(requestWithHeader('wrong-secret'))).toBe(false)
  })

  it('возвращает false если заголовок отсутствует', () => {
    expect(verifyCronSecret(requestWithHeader(null))).toBe(false)
  })

  it('возвращает false (fail-closed) если CRON_SECRET не задан в окружении', () => {
    delete process.env.CRON_SECRET
    expect(verifyCronSecret(requestWithHeader('anything'))).toBe(false)
  })

  it('возвращает false если CRON_SECRET пустая строка', () => {
    process.env.CRON_SECRET = ''
    expect(verifyCronSecret(requestWithHeader(''))).toBe(false)
  })
})
