/**
 * Фабрика именованных логгеров
 *
 * @example
 * ```ts
 * import { createLogger } from '@/lib/logger'
 * const log = createLogger('Partnership')
 * log.error('Ошибка отправки уведомления:', error)
 * // → [Partnership] Ошибка отправки уведомления: ...
 * ```
 */

export function createLogger(module: string) {
  const prefix = `[${module}]`
  return {
    info: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.info(prefix, ...args)
    },
    warn: (...args: unknown[]) => {
      console.warn(prefix, ...args)
    },
    error: (...args: unknown[]) => {
      console.error(prefix, ...args)
    },
  }
}
