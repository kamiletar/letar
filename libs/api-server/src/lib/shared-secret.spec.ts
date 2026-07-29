import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { verifySharedSecret } from './shared-secret'

function requestWithHeader(header: string, value: string | null): Request {
  const headers = new Headers()
  if (value !== null) {
    headers.set(header, value)
  }
  return new Request('https://example.com/api/test', { method: 'POST', headers })
}

describe('verifySharedSecret', () => {
  const originalSecret = process.env.TEST_SHARED_SECRET

  beforeEach(() => {
    process.env.TEST_SHARED_SECRET = 'test-secret'
  })

  afterEach(() => {
    process.env.TEST_SHARED_SECRET = originalSecret
  })

  const options = { envVar: 'TEST_SHARED_SECRET', header: 'x-test-secret' }

  it('возвращает true при совпадении заголовка и секрета из окружения', () => {
    expect(verifySharedSecret(requestWithHeader(options.header, 'test-secret'), options)).toBe(true)
  })

  it('возвращает false при несовпадении', () => {
    expect(verifySharedSecret(requestWithHeader(options.header, 'wrong-secret'), options)).toBe(false)
  })

  it('возвращает false если заголовок отсутствует', () => {
    expect(verifySharedSecret(requestWithHeader(options.header, null), options)).toBe(false)
  })

  it('возвращает false (fail-closed) если секрет не задан в окружении', () => {
    delete process.env.TEST_SHARED_SECRET
    expect(verifySharedSecret(requestWithHeader(options.header, 'anything'), options)).toBe(false)
  })

  it('возвращает false если секрет пустая строка', () => {
    process.env.TEST_SHARED_SECRET = ''
    expect(verifySharedSecret(requestWithHeader(options.header, ''), options)).toBe(false)
  })
})
