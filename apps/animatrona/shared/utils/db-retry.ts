/**
 * Retry-обёртка для SQLite операций
 *
 * libsql не поддерживает busy_timeout корректно (github.com/tursodatabase/libsql-client-ts/issues/288),
 * поэтому реализуем retry на уровне приложения для конкурентных записей.
 */

/** Ошибки SQLite, при которых стоит повторить операцию */
const RETRYABLE_PATTERNS = ['database is locked', 'SQLITE_BUSY', 'Operation has timed out', 'database table is locked']

export function isRetryableError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return RETRYABLE_PATTERNS.some((pattern) => message.includes(pattern))
}

export interface RetryOptions {
  /** Максимальное количество попыток (по умолчанию 5) */
  maxAttempts?: number
  /** Начальная задержка в мс (по умолчанию 100) */
  initialDelayMs?: number
  /** Контекст для логирования */
  context?: string
}

/**
 * Выполнить операцию с retry при SQLITE_BUSY / database locked
 *
 * Использует экспоненциальный backoff с jitter:
 * попытка 1: ~100ms, попытка 2: ~200ms, попытка 3: ~400ms, ...
 */
export async function withDbRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { maxAttempts = 5, initialDelayMs = 100, context = 'unknown' } = options

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts || !isRetryableError(error)) {
        throw error
      }

      // Экспоненциальный backoff с jitter (±25%)
      const baseDelay = initialDelayMs * 2 ** (attempt - 1)
      const jitter = baseDelay * 0.25 * (Math.random() * 2 - 1)
      const delay = Math.round(baseDelay + jitter)

      console.warn(`[DbRetry] Повтор операции (${context}): попытка ${attempt}/${maxAttempts}, задержка ${delay}мс`)

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  // TypeScript: unreachable, но нужно для типов
  throw new Error('withDbRetry: unreachable')
}
