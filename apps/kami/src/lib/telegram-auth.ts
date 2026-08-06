/**
 * Telegram Login Widget HMAC верификация
 *
 * Telegram Login Widget передаёт данные пользователя с HMAC-SHA256 подписью.
 * Мы проверяем подпись используя BOT_TOKEN как ключ.
 *
 * @see https://core.telegram.org/widgets/login#checking-authorization
 */

import crypto from 'crypto'

export interface TelegramAuthData {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  auth_date: number
  hash: string
}

/**
 * Проверяет HMAC-SHA256 подпись данных от Telegram Login Widget
 */
export function verifyTelegramAuth(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...authData } = data

  // Формируем строку для проверки (ключи в алфавитном порядке)
  const checkString = Object.keys(authData)
    .sort()
    .map((key) => `${key}=${authData[key as keyof typeof authData]}`)
    .join('\n')

  // Создаём секретный ключ как SHA256 от BOT_TOKEN
  const secretKey = crypto.createHash('sha256').update(botToken).digest()

  // Вычисляем HMAC-SHA256
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')

  // Сравниваем хеши
  return hmac === hash
}

/**
 * Проверяет, не устарели ли данные авторизации (не старше 5 минут)
 */
export function isTelegramAuthFresh(authDate: number, maxAgeSeconds = 300): boolean {
  const currentTime = Math.floor(Date.now() / 1000)
  return currentTime - authDate <= maxAgeSeconds
}

/**
 * Полная валидация Telegram авторизации
 */
export function validateTelegramAuth(
  data: TelegramAuthData,
  botToken: string,
): { valid: true; user: Omit<TelegramAuthData, 'hash'> } | { valid: false; error: string } {
  // Проверяем HMAC подпись
  if (!verifyTelegramAuth(data, botToken)) {
    return { valid: false, error: 'Invalid hash - data may have been tampered with' }
  }

  // Проверяем свежесть данных
  if (!isTelegramAuthFresh(data.auth_date)) {
    return { valid: false, error: 'Auth data is too old (max 5 minutes)' }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { hash, ...user } = data
  return { valid: true, user }
}
