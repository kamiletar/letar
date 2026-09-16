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

/** Методы, которыми реально пользуется main/ — подмножество `winston.Logger` */
interface LoggerMethods {
  error: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  debug: (...args: unknown[]) => void
}

/**
 * Прокси-объект для удобного доступа к логгеру
 * Использование: logger.info('Context', 'Message', data)
 *
 * ВАЖНО: Это прокси, который делегирует все вызовы в getLogger()
 * Это позволяет использовать `logger.info()` вместо `getLogger().info()`
 *
 * Типизирован как `LoggerMethods`, а не как класс `Logger` (у него только статические
 * `initialize`/`getInstance`, инстанс-методов нет) — иначе `logger.error(...)` не проходит
 * typecheck, хотя в рантайме прокси корректно делегирует в `getLogger().error(...)`.
 */
export const logger: LoggerMethods = new Proxy({} as LoggerMethods, {
  get(_target, prop: keyof LoggerMethods) {
    return getLogger()[prop]
  },
})

/**
 * Адаптер `logger` под интерфейс `JsonStoreLogger` (`@letar/electron-storage`).
 */
export const jsonStoreLogger = {
  error: (...args: unknown[]) => {
    logger.error(String(args[0]), ...args.slice(1))
  },
}
