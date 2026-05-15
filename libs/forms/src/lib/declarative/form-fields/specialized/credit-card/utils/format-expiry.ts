/**
 * Форматирует ввод срока действия карты в формат MM/YY.
 * Автоматически вставляет слэш после двух цифр месяца.
 *
 * @param raw - Сырой ввод пользователя
 * @returns Отформатированная строка MM/YY
 */
export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return ''

  if (digits.length <= 2) {
    return digits
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}`
}

/**
 * Валидирует срок действия карты.
 * Проверяет формат MM/YY и что карта не просрочена.
 *
 * @param expiry - Строка в формате MM/YY
 * @returns true если срок валиден и карта не просрочена
 */
export function isExpiryValid(expiry: string): boolean {
  const match = expiry.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return false

  const month = Number(match[1])
  const year = Number(match[2])

  if (month < 1 || month > 12) return false

  // Проверяем что карта не просрочена
  const now = new Date()
  const currentYear = now.getFullYear() % 100 // Двузначный год
  const currentMonth = now.getMonth() + 1

  if (year < currentYear) return false
  if (year === currentYear && month < currentMonth) return false

  return true
}
