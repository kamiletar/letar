/**
 * Утилита для повторных попыток с экспоненциальным backoff
 *
 * Используется для:
 * - Повторных попыток печати при временных ошибках принтера
 * - Повторного подключения к принтеру
 * - Любых операций, которые могут временно падать
 */

import { PrinterError, PrinterNotFoundError, PrinterNotReadyError, PrintTimeoutError } from './errors'

/** Опции для retry */
export interface RetryOptions {
  /** Максимальное количество попыток (по умолчанию 3) */
  maxAttempts?: number
  /** Начальная задержка в мс (по умолчанию 1000) */
  initialDelayMs?: number
  /** Максимальная задержка в мс (по умолчанию 30000) */
  maxDelayMs?: number
  /** Множитель для экспоненциального роста (по умолчанию 2) */
  backoffMultiplier?: number
  /** Добавлять случайный jitter к задержке (по умолчанию true) */
  jitter?: boolean
  /** Функция для определения, стоит ли повторять попытку */
  shouldRetry?: (error: Error) => boolean
  /** Callback при каждой retry попытке */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
}

/** Результат выполнения retry */
export interface RetryResult<T> {
  /** Успешный результат */
  success: boolean
  /** Данные при успехе */
  data?: T
  /** Ошибка при неудаче */
  error?: Error
  /** Количество выполненных попыток */
  attempts: number
  /** Общее время выполнения в мс */
  totalTimeMs: number
}

/** Дефолтные опции */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
}

/**
 * Определяет, является ли ошибка временной и стоит ли повторять попытку
 * По умолчанию: retry для PrinterNotReadyError и PrintTimeoutError,
 * не retry для PrinterNotFoundError (нет смысла)
 */
export function isRetryableError(error: Error): boolean {
  // Принтер не найден — нет смысла повторять
  if (error instanceof PrinterNotFoundError) {
    return false
  }

  // Принтер не готов или таймаут — можно повторить
  if (error instanceof PrinterNotReadyError || error instanceof PrintTimeoutError) {
    return true
  }

  // Другие ошибки принтера — можно попробовать
  if (error instanceof PrinterError) {
    return true
  }

  // Сетевые ошибки и таймауты
  const message = error.message.toLowerCase()
  if (
    message.includes('timeout')
    || message.includes('connection')
    || message.includes('busy')
    || message.includes('недоступен')
    || message.includes('занят')
  ) {
    return true
  }

  // По умолчанию не повторяем (валидация, неверный формат и т.д.)
  return false
}

/**
 * Вычисляет задержку для следующей попытки с экспоненциальным backoff
 */
export function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  backoffMultiplier: number,
  maxDelayMs: number,
  jitter: boolean,
): number {
  // Экспоненциальный backoff: delay = initialDelay * multiplier^(attempt-1)
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)

  // Ограничиваем максимальной задержкой
  let delay = Math.min(exponentialDelay, maxDelayMs)

  // Добавляем jitter (±25%) для предотвращения thundering herd
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5 // от 0.75 до 1.25
    delay = Math.round(delay * jitterFactor)
  }

  return delay
}

/**
 * Делает паузу на указанное количество миллисекунд
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Выполняет функцию с автоматическими повторными попытками при ошибках
 *
 * @example
 * ```typescript
 * // Базовое использование
 * const result = await retry(
 *   () => printerService.print(image, markingCode),
 *   { maxAttempts: 3 }
 * )
 *
 * // С кастомным onRetry
 * const result = await retry(
 *   () => printerService.print(image, markingCode),
 *   {
 *     maxAttempts: 5,
 *     onRetry: (attempt, error, delay) => {
 *       logger.warn(`Retry attempt ${attempt}, waiting ${delay}ms`, { error })
 *     }
 *   }
 * )
 * ```
 */
export async function retry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<RetryResult<T>> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options,
  }

  const shouldRetry = opts.shouldRetry ?? isRetryableError
  const startTime = Date.now()
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Если достигли максимума попыток — выходим
      if (attempt >= opts.maxAttempts) {
        break
      }

      // Проверяем, стоит ли повторять
      if (!shouldRetry(lastError)) {
        break
      }

      // Вычисляем задержку
      const delayMs = calculateDelay(attempt, opts.initialDelayMs, opts.backoffMultiplier, opts.maxDelayMs, opts.jitter)

      // Вызываем callback
      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, delayMs)
      }

      // Ждём перед следующей попыткой
      await sleep(delayMs)
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: opts.maxAttempts,
    totalTimeMs: Date.now() - startTime,
  }
}

/**
 * Обёртка для создания функции с retry
 *
 * @example
 * ```typescript
 * const printWithRetry = withRetry(
 *   (image: Buffer, code: MarkingCode) => printerService.print(image, code),
 *   { maxAttempts: 3 }
 * )
 *
 * // Использование
 * const result = await printWithRetry(imageBuffer, markingCode)
 * ```
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {},
): (...args: TArgs) => Promise<RetryResult<TResult>> {
  return async (...args: TArgs) => {
    return retry(() => fn(...args), options)
  }
}
