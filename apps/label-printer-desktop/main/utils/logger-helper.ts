/**
 * Хелпер для логирования
 * ВАЖНО: Все функции используют ленивую инициализацию,
 * чтобы избежать ошибки "Logger not initialized" при импорте модулей
 */
import { Logger } from '@letar/label-printer-core'

/**
 * Функция-геттер для ленивой инициализации логгера
 * Использование: getLogger().info('Context', 'Message', data)
 */
export const getLogger = () => Logger.getInstance()

/**
 * Прокси-объект для удобного доступа к логгеру
 * Использование: logger.info('Context', 'Message', data)
 *
 * ВАЖНО: Это прокси, который делегирует все вызовы в getLogger()
 * Это позволяет использовать `logger.info()` вместо `getLogger().info()`
 */
export const logger: Logger = new Proxy({} as Logger, {
  get(_target, prop: keyof Logger) {
    return getLogger()[prop]
  },
})
