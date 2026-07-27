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

/**
 * Адаптер `logger` под интерфейс `JsonStoreLogger` (`@letar/electron-storage`).
 *
 * `logger` выше типизирован как класс `Logger` (статический, без инстанс-методов) —
 * в рантайме прокси корректно делегирует в `getLogger().error(...)`, но статически
 * `logger.error` не существует на уровне типов. `getLogger()` возвращает реальный
 * `winston.Logger` с типизированным `.error`, поэтому берём метод оттуда напрямую.
 */
export const jsonStoreLogger = {
  error: (...args: unknown[]) => {
    getLogger().error(String(args[0]), ...args.slice(1))
  },
}
