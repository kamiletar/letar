import crypto from 'crypto'
import { prismaAuth } from './prisma'

/**
 * Генерирует токен верификации для email или сброса пароля.
 * Использует таблицу Verification из Better Auth.
 */
export async function generateVerificationToken(
  email: string,
  type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' = 'EMAIL_VERIFICATION'
) {
  // Генерация случайного токена
  const value = crypto.randomBytes(32).toString('hex')

  // Время жизни токена
  const expiresInHours = type === 'EMAIL_VERIFICATION' ? 24 : 1
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  // Удаление старых токенов для этого email и типа
  await prismaAuth.verification.deleteMany({
    where: {
      identifier: email,
      type,
    },
  })

  // Создание нового токена
  const verification = await prismaAuth.verification.create({
    data: {
      identifier: email,
      value,
      expiresAt,
      type,
    },
  })

  return verification
}

/**
 * Проверяет токен верификации.
 */
export async function verifyToken(token: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
  const verification = await prismaAuth.verification.findFirst({
    where: { value: token },
  })

  if (!verification) {
    return { error: 'Неверный токен' }
  }

  if (verification.type !== type) {
    return { error: 'Неверный тип токена' }
  }

  if (verification.expiresAt < new Date()) {
    // Удаляем истекший токен
    await prismaAuth.verification.delete({
      where: { id: verification.id },
    })
    return { error: 'Токен истек' }
  }

  return { success: true, identifier: verification.identifier }
}

/**
 * Удаляет токен верификации.
 */
export async function deleteToken(token: string) {
  await prismaAuth.verification.deleteMany({
    where: { value: token },
  })
}
