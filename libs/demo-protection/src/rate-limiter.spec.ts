import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, RATE_LIMIT_ERROR } from './rate-limiter'

// Store — module-level Map, общая между тестами. Каждый тест берёт свой уникальный IP,
// чтобы не зависеть от порядка выполнения и не течь состоянием между кейсами.
let ipCounter = 0
function uniqueIp() {
  ipCounter += 1
  return `10.0.0.${ipCounter}`
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('разрешает первый запрос для нового IP', () => {
    expect(checkRateLimit(uniqueIp())).toBe(true)
  })

  it('разрешает ровно `limit` запросов подряд, затем блокирует', () => {
    const ip = uniqueIp()
    const limit = 3

    expect(checkRateLimit(ip, limit)).toBe(true)
    expect(checkRateLimit(ip, limit)).toBe(true)
    expect(checkRateLimit(ip, limit)).toBe(true)
    expect(checkRateLimit(ip, limit)).toBe(false)
  })

  it('не пускает запросы сверх лимита, пока окно не истекло', () => {
    const ip = uniqueIp()
    const limit = 2

    expect(checkRateLimit(ip, limit, 60_000)).toBe(true)
    expect(checkRateLimit(ip, limit, 60_000)).toBe(true)
    expect(checkRateLimit(ip, limit, 60_000)).toBe(false)
    expect(checkRateLimit(ip, limit, 60_000)).toBe(false)
  })

  it('сбрасывает счётчик после истечения окна', () => {
    const ip = uniqueIp()
    const limit = 1
    const windowMs = 60_000

    expect(checkRateLimit(ip, limit, windowMs)).toBe(true)
    expect(checkRateLimit(ip, limit, windowMs)).toBe(false)

    vi.advanceTimersByTime(windowMs + 1)

    expect(checkRateLimit(ip, limit, windowMs)).toBe(true)
  })

  it('не сбрасывает счётчик, если окно ещё не истекло', () => {
    const ip = uniqueIp()
    const limit = 1
    const windowMs = 60_000

    expect(checkRateLimit(ip, limit, windowMs)).toBe(true)

    vi.advanceTimersByTime(windowMs - 1)

    expect(checkRateLimit(ip, limit, windowMs)).toBe(false)
  })

  it('ведёт независимый счётчик для разных IP', () => {
    const ipA = uniqueIp()
    const ipB = uniqueIp()
    const limit = 1

    expect(checkRateLimit(ipA, limit)).toBe(true)
    expect(checkRateLimit(ipA, limit)).toBe(false)
    // Другой IP не задет чужим лимитом
    expect(checkRateLimit(ipB, limit)).toBe(true)
  })

  it('использует лимит и окно по умолчанию (10 запросов / 60с)', () => {
    const ip = uniqueIp()

    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit(ip)).toBe(true)
    }
    expect(checkRateLimit(ip)).toBe(false)
  })
})

describe('RATE_LIMIT_ERROR', () => {
  it('содержит человекочитаемое сообщение об ошибке', () => {
    expect(RATE_LIMIT_ERROR).toBe('Слишком много запросов. Попробуйте через минуту.')
  })
})
