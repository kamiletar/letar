import { describe, expect, it, vi } from 'vitest'
import { PrinterError, PrinterNotFoundError, PrinterNotReadyError, PrintTimeoutError } from './errors'
import { calculateDelay, isRetryableError, retry, withRetry } from './retry'

describe('retry utility', () => {
  describe('isRetryableError', () => {
    it('возвращает false для PrinterNotFoundError', () => {
      const error = new PrinterNotFoundError('Printer not found')
      expect(isRetryableError(error)).toBe(false)
    })

    it('возвращает true для PrinterNotReadyError', () => {
      const error = new PrinterNotReadyError('Printer busy')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает true для PrintTimeoutError', () => {
      const error = new PrintTimeoutError('Print timeout')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает true для PrinterError', () => {
      const error = new PrinterError('Generic printer error')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает true для ошибок с timeout в сообщении', () => {
      const error = new Error('Connection timeout')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает true для ошибок с connection в сообщении', () => {
      const error = new Error('Connection refused')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает true для ошибок с busy в сообщении', () => {
      const error = new Error('Device busy')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает true для ошибок с занят в сообщении', () => {
      const error = new Error('Принтер занят')
      expect(isRetryableError(error)).toBe(true)
    })

    it('возвращает false для обычных ошибок', () => {
      const error = new Error('Invalid GTIN format')
      expect(isRetryableError(error)).toBe(false)
    })
  })

  describe('calculateDelay', () => {
    it('вычисляет базовую задержку для первой попытки', () => {
      const delay = calculateDelay(1, 1000, 2, 30000, false)
      expect(delay).toBe(1000) // 1000 * 2^0 = 1000
    })

    it('вычисляет экспоненциальную задержку', () => {
      expect(calculateDelay(2, 1000, 2, 30000, false)).toBe(2000) // 1000 * 2^1
      expect(calculateDelay(3, 1000, 2, 30000, false)).toBe(4000) // 1000 * 2^2
      expect(calculateDelay(4, 1000, 2, 30000, false)).toBe(8000) // 1000 * 2^3
    })

    it('ограничивает максимальной задержкой', () => {
      const delay = calculateDelay(10, 1000, 2, 5000, false)
      expect(delay).toBe(5000) // Не более maxDelayMs
    })

    it('добавляет jitter когда включён', () => {
      // С jitter результат будет в диапазоне 75%-125% от базовой задержки
      const delay = calculateDelay(1, 1000, 2, 30000, true)
      expect(delay).toBeGreaterThanOrEqual(750)
      expect(delay).toBeLessThanOrEqual(1250)
    })
  })

  describe('retry', () => {
    it('возвращает результат при успешном выполнении', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await retry(fn, { maxAttempts: 3 })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(1)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('повторяет попытки при retryable ошибке', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new PrinterNotReadyError('Busy'))
        .mockRejectedValueOnce(new PrinterNotReadyError('Busy'))
        .mockResolvedValue('success')

      const result = await retry(fn, {
        maxAttempts: 5,
        initialDelayMs: 10, // Быстрее для тестов
        jitter: false,
      })

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(result.attempts).toBe(3)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('не повторяет попытки при non-retryable ошибке', async () => {
      const fn = vi.fn().mockRejectedValue(new PrinterNotFoundError('Not found'))

      const result = await retry(fn, {
        maxAttempts: 5,
        initialDelayMs: 10,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(PrinterNotFoundError)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('останавливается после maxAttempts', async () => {
      const fn = vi.fn().mockRejectedValue(new PrinterNotReadyError('Busy'))

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
        jitter: false,
      })

      expect(result.success).toBe(false)
      expect(result.attempts).toBe(3)
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('вызывает onRetry callback', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new PrinterNotReadyError('Busy')).mockResolvedValue('success')

      const onRetry = vi.fn()

      await retry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
        jitter: false,
        onRetry,
      })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(PrinterNotReadyError), 10)
    })

    it('использует кастомный shouldRetry', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Custom error'))
      const shouldRetry = vi.fn().mockReturnValue(false)

      const result = await retry(fn, {
        maxAttempts: 5,
        shouldRetry,
      })

      expect(result.success).toBe(false)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledWith(expect.any(Error))
    })

    it('измеряет общее время выполнения', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new PrinterNotReadyError('Busy')).mockResolvedValue('success')

      const result = await retry(fn, {
        maxAttempts: 3,
        initialDelayMs: 50,
        jitter: false,
      })

      // Должно быть как минимум одна задержка (50ms)
      expect(result.totalTimeMs).toBeGreaterThanOrEqual(40)
    })

    it('преобразует не-Error в Error', async () => {
      const fn = vi.fn().mockRejectedValue('string error')

      const result = await retry(fn, {
        maxAttempts: 1,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error?.message).toBe('string error')
    })
  })

  describe('withRetry', () => {
    it('создаёт функцию с retry', async () => {
      const originalFn = vi.fn().mockResolvedValue('success')
      const wrappedFn = withRetry(originalFn, { maxAttempts: 3 })

      const result = await wrappedFn('arg1', 'arg2')

      expect(result.success).toBe(true)
      expect(result.data).toBe('success')
      expect(originalFn).toHaveBeenCalledWith('arg1', 'arg2')
    })

    it('передаёт аргументы в оригинальную функцию', async () => {
      const fn = vi.fn((a: number, b: number) => Promise.resolve(a + b))
      const wrappedFn = withRetry(fn, { maxAttempts: 3 })

      const result = await wrappedFn(2, 3)

      expect(result.success).toBe(true)
      expect(result.data).toBe(5)
    })

    it('применяет retry логику', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new PrinterNotReadyError('Busy')).mockResolvedValue('success')

      const wrappedFn = withRetry(fn, {
        maxAttempts: 3,
        initialDelayMs: 10,
      })

      const result = await wrappedFn()

      expect(result.success).toBe(true)
      expect(result.attempts).toBe(2)
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })
})
