/**
 * Централизованная функция получения URL приложения.
 * Заменяет 13+ разных паттернов с захардкоженными URL.
 */

const PRODUCTION_URL = 'https://xn--80aaah6cnh.xn--p1ai'
const DEV_URL = 'http://localhost:3003'

/**
 * Получает базовый URL приложения из переменных окружения.
 * Приоритет: NEXT_PUBLIC_APP_URL → BETTER_AUTH_URL → fallback по NODE_ENV.
 */
export function getAppUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.BETTER_AUTH_URL ||
    (process.env.NODE_ENV === 'development' ? DEV_URL : PRODUCTION_URL)
  )
}
