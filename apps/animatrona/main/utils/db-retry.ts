/**
 * Retry-обёртка для SQLite операций (main process)
 *
 * Реэкспорт из shared с добавлением модульного логгера.
 */

import { createModuleLogger } from './logger'

import { type RetryOptions, withDbRetry as baseRetry } from '../../shared/utils/db-retry'

export { isRetryableError } from '../../shared/utils/db-retry'
export type { RetryOptions }

const log = createModuleLogger('DbRetry')

/**
 * Выполнить операцию с retry при SQLITE_BUSY / database locked
 * Версия для main-процесса с модульным логгером
 */
export async function withDbRetry<T>(operation: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { context = 'unknown' } = options

  return baseRetry(operation, {
    ...options,
    // Переопределяем context для логирования через модульный логгер
    context,
  }).catch((error) => {
    log.error('Операция не удалась после всех попыток', { context, error })
    throw error
  })
}
