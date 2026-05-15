import { prismaAuth } from './prisma'

/**
 * Получение IP адреса клиента из запроса.
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return '127.0.0.1'
}

interface RateLimitResult {
  allowed: boolean
  blockedUntil?: Date
  attempts: number
}

const RATE_LIMIT_CONFIG = {
  register: { maxAttempts: 5, blockDurationMinutes: 60 },
  login: { maxAttempts: 10, blockDurationMinutes: 15 },
  resetPassword: { maxAttempts: 5, blockDurationMinutes: 60 },
  verifyEmail: { maxAttempts: 10, blockDurationMinutes: 60 },
} as const

type RateLimitAction = keyof typeof RATE_LIMIT_CONFIG

/**
 * Проверка rate limit для действия.
 * Использует таблицу LoginAttempt для хранения попыток.
 */
export async function checkRateLimit(
  identifier: string,
  type: 'IP' | 'EMAIL',
  action: RateLimitAction
): Promise<RateLimitResult> {
  const config = RATE_LIMIT_CONFIG[action]

  // Найти существующую запись
  const attempt = await prismaAuth.loginAttempt.findFirst({
    where: {
      identifier,
      type,
    },
  })

  // Если записи нет, разрешаем и создаём новую
  if (!attempt) {
    await prismaAuth.loginAttempt.create({
      data: {
        identifier,
        type,
        attempts: 1,
      },
    })
    return { allowed: true, attempts: 1 }
  }

  // Если заблокирован и блокировка ещё активна
  if (attempt.blockedUntil && attempt.blockedUntil > new Date()) {
    return {
      allowed: false,
      blockedUntil: attempt.blockedUntil,
      attempts: attempt.attempts,
    }
  }

  // Если блокировка истекла, сбрасываем
  if (attempt.blockedUntil && attempt.blockedUntil <= new Date()) {
    await prismaAuth.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        attempts: 1,
        blockedUntil: null,
      },
    })
    return { allowed: true, attempts: 1 }
  }

  // Увеличиваем счётчик попыток
  const newAttempts = attempt.attempts + 1

  if (newAttempts > config.maxAttempts) {
    // Блокируем
    const blockedUntil = new Date(Date.now() + config.blockDurationMinutes * 60 * 1000)
    await prismaAuth.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        attempts: newAttempts,
        blockedUntil,
      },
    })
    return { allowed: false, blockedUntil, attempts: newAttempts }
  }

  // Обновляем счётчик
  await prismaAuth.loginAttempt.update({
    where: { id: attempt.id },
    data: { attempts: newAttempts },
  })

  return { allowed: true, attempts: newAttempts }
}

/**
 * Сброс rate limit после успешной операции.
 */
export async function resetRateLimit(identifier: string, type: 'IP' | 'EMAIL'): Promise<void> {
  await prismaAuth.loginAttempt.deleteMany({
    where: {
      identifier,
      type,
    },
  })
}
