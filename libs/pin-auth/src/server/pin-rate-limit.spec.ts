import { describe, expect, it } from 'vitest'
import { createPinVerifyRateLimiter } from './pin-rate-limit'

describe('createPinVerifyRateLimiter', () => {
  it('пропускает запросы, пока не превышен maxRequests', async () => {
    const isRateLimited = createPinVerifyRateLimiter(() => '1.2.3.4', { windowMs: 60_000, maxRequests: 2 })

    expect(await isRateLimited()).toBe(false)
    expect(await isRateLimited()).toBe(false)
  })

  it('блокирует после превышения maxRequests для одного IP', async () => {
    const isRateLimited = createPinVerifyRateLimiter(() => '1.2.3.4', { windowMs: 60_000, maxRequests: 2 })

    await isRateLimited()
    await isRateLimited()

    expect(await isRateLimited()).toBe(true)
  })

  it('считает разные IP независимо', async () => {
    let ip = '1.1.1.1'
    const isRateLimited = createPinVerifyRateLimiter(() => ip, { windowMs: 60_000, maxRequests: 1 })

    expect(await isRateLimited()).toBe(false) // 1.1.1.1: 1-й запрос — пропущен
    expect(await isRateLimited()).toBe(true) // 1.1.1.1: 2-й запрос — превышен лимит

    ip = '2.2.2.2'
    expect(await isRateLimited()).toBe(false) // 2.2.2.2: свой отдельный счётчик
  })

  it('трактует null/undefined IP как единый ключ "unknown"', async () => {
    let call = 0
    const isRateLimited = createPinVerifyRateLimiter(() => (call++ === 0 ? null : undefined), {
      windowMs: 60_000,
      maxRequests: 1,
    })

    expect(await isRateLimited()).toBe(false)
    expect(await isRateLimited()).toBe(true)
  })
})
