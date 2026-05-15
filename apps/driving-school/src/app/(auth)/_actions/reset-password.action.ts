'use server'

import { prisma } from '@/lib/db'
import { hash } from 'bcryptjs'
import type { ResetPasswordFormData } from '../_schemas/reset-password.schema'

export type ResetPasswordResult =
  | { success: true }
  | { success: false; error: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'USER_NOT_FOUND' | 'UNKNOWN_ERROR' }

/**
 * Хеширование пароля с bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return hash(password, 12)
}

/**
 * Server action для сброса пароля по токену
 */
export async function resetPassword(data: ResetPasswordFormData): Promise<ResetPasswordResult> {
  try {
    // Ищем токен в базе
    const verification = await prisma.verification.findUnique({
      where: { value: data.token },
    })

    if (!verification) {
      return { success: false, error: 'TOKEN_INVALID' }
    }

    // Проверяем срок действия токена
    if (verification.expiresAt < new Date()) {
      // Удаляем истекший токен
      await prisma.verification.delete({
        where: { value: data.token },
      })
      return { success: false, error: 'TOKEN_EXPIRED' }
    }

    // Ищем пользователя по email из токена
    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
    })

    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' }
    }

    // Хешируем новый пароль
    const hashedPassword = await hashPassword(data.password)

    // Обновляем пароль пользователя
    await prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        // Также подтверждаем email, если он ещё не подтверждён
        emailVerified: user.emailVerified || true,
      },
    })

    // Удаляем использованный токен
    await prisma.verification.delete({
      where: { value: data.token },
    })

    return { success: true }
  } catch (error) {
    console.error('Password reset error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Проверяет валидность токена сброса пароля
 */
export async function validateResetToken(
  token: string
): Promise<{ valid: true; email: string } | { valid: false; error: 'TOKEN_INVALID' | 'TOKEN_EXPIRED' }> {
  try {
    const verification = await prisma.verification.findUnique({
      where: { value: token },
    })

    if (!verification) {
      return { valid: false, error: 'TOKEN_INVALID' }
    }

    if (verification.expiresAt < new Date()) {
      return { valid: false, error: 'TOKEN_EXPIRED' }
    }

    return { valid: true, email: verification.identifier }
  } catch {
    return { valid: false, error: 'TOKEN_INVALID' }
  }
}

/**
 * Помечает, что страница сброса пароля была открыта (для SSE уведомлений)
 */
export async function markResetPageOpened(email: string): Promise<void> {
  const identifier = `reset-opened:${email}`
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 час

  // Удаляем старую метку если есть
  await prisma.verification.deleteMany({
    where: { identifier },
  })

  // Создаём новую метку
  await prisma.verification.create({
    data: {
      identifier,
      value: `opened-${Date.now()}`,
      expiresAt,
      type: 'RESET_OPENED_MARKER',
    },
  })
}
