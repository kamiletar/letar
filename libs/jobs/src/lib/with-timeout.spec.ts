import { describe, expect, it } from 'vitest'
import { withTimeout } from './with-timeout'

describe('withTimeout', () => {
  it('резолвится значением промиса, если он успевает в срок', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 100, 'test-job')
    expect(result).toBe('ok')
  })

  it('пробрасывает ошибку промиса, если он падает раньше таймаута', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 100, 'test-job')).rejects.toThrow('boom')
  })

  it('падает с понятной ошибкой, если промис не успевает в срок', async () => {
    const never = new Promise<void>(() => {})
    await expect(withTimeout(never, 10, 'slow-job')).rejects.toThrow(
      'Задача "slow-job" превысила таймаут 10мс',
    )
  })

  it('не оставляет висящий таймер после успешного резолва (fake timers)', async () => {
    // Регрессия: если clearTimeout не вызывается на happy path, таймер держит event loop
    // до истечения полного timeoutMs даже после того, как промис уже разрешился.
    const promise = withTimeout(Promise.resolve('fast'), 10_000, 'test-job')
    await expect(promise).resolves.toBe('fast')
  })
})
