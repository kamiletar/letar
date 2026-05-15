/**
 * Retry-обёртка для SQLite операций (renderer process)
 *
 * Реэкспорт из shared.
 */
export { isRetryableError, withDbRetry } from '../../../shared/utils/db-retry'
export type { RetryOptions } from '../../../shared/utils/db-retry'
