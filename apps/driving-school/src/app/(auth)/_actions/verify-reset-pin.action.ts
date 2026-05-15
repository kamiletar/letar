'use server'

import { prisma } from '@/lib/db'
import crypto from 'crypto'

export type VerifyResetPinResult =
  | { success: true; resetToken: string }
  | { success: false; error: 'INVALID_PIN' | 'PIN_EXPIRED' | 'TOO_MANY_ATTEMPTS' | 'NOT_FOUND' | 'UNKNOWN_ERROR' }

/**
 * Генерация токена для сброса пароля после верификации пинкода
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Server action для верификации пинкода сброса пароля
 * Возвращает токен для перехода на страницу сброса
 */
export async function verifyResetPinAction(email: string, pin: string): Promise<VerifyResetPinResult> {
  try {
    const pinIdentifier = `reset-pin:${email}`

    // Находим токен пинкода
    const pinToken = await prisma.verification.findFirst({
      where: { identifier: pinIdentifier },
      orderBy: { expiresAt: 'desc' },
    })

    if (!pinToken) {
      return { success: false, error: 'NOT_FOUND' }
    }

    // Проверяем срок действия
    if (pinToken.expiresAt < new Date()) {
      return { success: false, error: 'PIN_EXPIRED' }
    }

    // Проверяем пинкод (хранится в поле value)
    if (pinToken.value !== pin) {
      return { success: false, error: 'INVALID_PIN' }
    }

    // Пинкод верный — находим основной токен сброса или создаём новый
    let resetToken = await prisma.verification.findFirst({
      where: { identifier: email, type: 'PASSWORD_RESET' },
      orderBy: { expiresAt: 'desc' },
    })

    if (!resetToken || resetToken.expiresAt < new Date()) {
      // Создаём новый токен сброса
      const newToken = generateResetToken()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 час

      resetToken = await prisma.verification.create({
        data: {
          identifier: email,
          value: newToken,
          expiresAt,
          type: 'PASSWORD_RESET',
        },
      })
    }

    // Удаляем использованный пинкод
    await prisma.verification.delete({
      where: { id: pinToken.id },
    })

    return { success: true, resetToken: resetToken.value }
  } catch (error) {
    console.error('Verify reset pin error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Server action для повторной отправки пинкода сброса пароля
 */
export async function resendResetPinAction(
  email: string
): Promise<{ success: true } | { success: false; error: 'RATE_LIMITED' | 'NOT_FOUND' | 'UNKNOWN_ERROR' }> {
  try {
    // Проверяем, есть ли недавний запрос (rate limiting)
    const pinIdentifier = `reset-pin:${email}`
    const existingPin = await prisma.verification.findFirst({
      where: { identifier: pinIdentifier },
      orderBy: { expiresAt: 'desc' },
    })

    // Если пинкод создан менее 60 секунд назад - rate limit
    if (existingPin) {
      const createdAt = new Date(existingPin.expiresAt.getTime() - 60 * 60 * 1000) // expiresAt - 1 час = createdAt
      const secondsSinceCreation = (Date.now() - createdAt.getTime()) / 1000
      if (secondsSinceCreation < 60) {
        return { success: false, error: 'RATE_LIMITED' }
      }
    }

    // Импортируем requestPasswordReset динамически чтобы избежать циклических зависимостей
    const { requestPasswordReset } = await import('./forgot-password.action')

    // Вызываем action с типизированными данными
    await requestPasswordReset({ email })

    return { success: true }
  } catch (error) {
    console.error('Resend reset pin error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
