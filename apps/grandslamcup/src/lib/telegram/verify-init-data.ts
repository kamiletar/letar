/**
 * Валидация Telegram WebApp initData по официальной схеме.
 *
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. Парсим query-string из `initData`
 * 2. Извлекаем `hash` (это HMAC SHA-256 от data-check-string)
 * 3. Сортируем оставшиеся пары `key=value` по ключу алфавитно
 * 4. Склеиваем через `\n` → data-check-string
 * 5. secret_key = HMAC_SHA256("WebAppData", bot_token)
 * 6. computed = HMAC_SHA256(secret_key, data-check-string).hex()
 * 7. Если computed === hash → данные подлинные, можно доверять `initDataUnsafe.user`
 *
 * Дополнительно проверяем `auth_date` — initData не должна быть старше 24 часов
 * (защита от replay-атак с одноразово полученным валидным initData).
 */

import { createHmac } from 'node:crypto'

import { prisma } from '@/lib/db'

/** Максимальный возраст initData (защита от replay) */
const MAX_AGE_SECONDS = 24 * 60 * 60 // 24 часа

export interface VerifiedTelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface VerifyResult {
  ok: boolean
  user?: VerifiedTelegramUser
  authDate?: Date
  error?: string
}

/**
 * Проверить подлинность Telegram WebApp initData.
 *
 * Возвращает `{ok: false}` без ошибки если initData пустой —
 * это нормально для случая «страница открыта вне Telegram».
 */
export async function verifyTelegramInitData(initData: string): Promise<VerifyResult> {
  if (!initData) {
    return { ok: false }
  }

  // Берём токен бота из глобального конфига (тот же, что использует grammy)
  const config = await prisma.telegramConfig.findUnique({
    where: { id: 'default' },
    select: { botToken: true, enabled: true },
  })
  if (!config?.botToken || !config.enabled) {
    return { ok: false, error: 'Telegram-бот не настроен' }
  }

  let params: URLSearchParams
  try {
    params = new URLSearchParams(initData)
  } catch {
    return { ok: false, error: 'Некорректный initData' }
  }

  const hash = params.get('hash')
  if (!hash) {
    return { ok: false, error: 'initData без hash' }
  }
  params.delete('hash')

  // data-check-string: пары key=value, отсортированные по ключу, склеенные через \n
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  // secret_key = HMAC_SHA256("WebAppData", bot_token)
  const secretKey = createHmac('sha256', 'WebAppData').update(config.botToken).digest()
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (computedHash !== hash) {
    return { ok: false, error: 'initData hash mismatch' }
  }

  // Проверка возраста
  const authDateStr = params.get('auth_date')
  if (!authDateStr) {
    return { ok: false, error: 'initData без auth_date' }
  }
  const authDateSeconds = Number.parseInt(authDateStr, 10)
  if (!Number.isFinite(authDateSeconds)) {
    return { ok: false, error: 'некорректный auth_date' }
  }
  const ageSeconds = Math.floor(Date.now() / 1000) - authDateSeconds
  if (ageSeconds > MAX_AGE_SECONDS) {
    return { ok: false, error: `initData слишком старый (${Math.floor(ageSeconds / 3600)}ч)` }
  }

  // Парсим объект user
  const userJson = params.get('user')
  if (!userJson) {
    return { ok: true, authDate: new Date(authDateSeconds * 1000) }
  }

  let user: VerifiedTelegramUser
  try {
    user = JSON.parse(userJson) as VerifiedTelegramUser
  } catch {
    return { ok: false, error: 'некорректный user JSON' }
  }

  return {
    ok: true,
    user,
    authDate: new Date(authDateSeconds * 1000),
  }
}
