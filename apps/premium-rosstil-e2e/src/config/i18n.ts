/**
 * Конфигурация i18n для E2E тестов
 *
 * Все URL-пути в тестах должны использовать эту константу
 * для добавления префикса локали
 */

/**
 * Базовый путь для текущей локали
 * @example '/ru' для русской локали
 */
export const LOCALE_PREFIX = '/ru'

/**
 * Генерирует полный путь с учётом локали
 * @param path - путь без локали (например, '/profile')
 * @returns путь с локалью (например, '/ru/profile')
 */
export function localePath(path: string): string {
  // Убираем лишний слэш если path начинается с '/'
  if (path.startsWith('/')) {
    return `${LOCALE_PREFIX}${path}`
  }
  return `${LOCALE_PREFIX}/${path}`
}

/**
 * Regex паттерн для проверки URL с учётом локали
 * @param pathPattern - паттерн пути (например, '/auth/signin' или regex строка)
 * @returns RegExp с учётом локали
 */
export function localeUrlPattern(pathPattern: string): RegExp {
  // Экранируем специальные символы regex кроме уже экранированных
  const escaped = pathPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`${LOCALE_PREFIX}${escaped}`)
}
