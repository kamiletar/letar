import { describe, expect, it, vi } from 'vitest'
import { withTimeout } from './with-timeout'

/**
 * Ключевой сценарий здесь — «промис, который не завершается никогда».
 * Именно он положил агента на s3: `await rehydrateFromRedis()` висел в offline-очереди ioredis,
 * не отклоняясь, и Fastify убивал плагин по своему таймауту.
 */
describe('withTimeout', () => {
  it('возвращает результат, если успели', async () => {
    const result = await withTimeout(Promise.resolve('готово'), { ms: 1000, fallback: 'запасное' })
    expect(result).toBe('готово')
  })

  it('возвращает fallback для промиса, который не завершится НИКОГДА', async () => {
    const never = new Promise<string>(() => {/* никогда не завершается — в этом весь смысл */})

    const result = await withTimeout(never, { ms: 10, fallback: 'запасное', label: 'rehydrate' })

    expect(result).toBe('запасное')
  })

  it('без fallback отклоняется, а не висит', async () => {
    const never = new Promise<string>(() => {/* никогда не завершается — в этом весь смысл */})

    await expect(withTimeout(never, { ms: 10, label: 'обязательная загрузка' })).rejects.toThrow(
      /обязательная загрузка.*10мс/,
    )
  })

  it('пробрасывает ошибку исходного промиса без изменений', async () => {
    const failing = Promise.reject(new Error('соединение отвергнуто'))

    await expect(withTimeout(failing, { ms: 1000, fallback: 'запасное' })).rejects.toThrow('соединение отвергнуто')
  })

  it('`fallback: undefined` — это выбор «продолжить без результата», а не отсутствие fallback', async () => {
    const never = new Promise<string | undefined>(() => {/* никогда не завершается */})

    const result = await withTimeout(never, { ms: 10, fallback: undefined })

    expect(result).toBeUndefined()
  })

  it('не оставляет висящий таймер после успешного завершения', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout')

    await withTimeout(Promise.resolve(1), { ms: 60_000, fallback: 0 })

    expect(clearSpy).toHaveBeenCalled()
    clearSpy.mockRestore()
  })
})
