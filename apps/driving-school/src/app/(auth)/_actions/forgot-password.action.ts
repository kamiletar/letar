'use server'

import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@letar/email'
import crypto from 'crypto'
import type { ForgotPasswordFormData } from '../_schemas/forgot-password.schema'

export type ForgotPasswordResult = { success: true } | { success: false; error: 'VALIDATION_ERROR' | 'UNKNOWN_ERROR' }

/**
 * Генерация токена сброса пароля
 */
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Генерация 6-значного пинкода
 */
function generatePin(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Server action для запроса восстановления пароля
 * Всегда возвращает success: true чтобы не раскрывать существование email
 */
export async function requestPasswordReset(data: ForgotPasswordFormData): Promise<ForgotPasswordResult> {
  try {
    // Ищем пользователя по email
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, name: true, email: true, hashedPassword: true },
    })

    // Если пользователь не найден или у него нет пароля (OAuth only) - молча возвращаем успех
    if (!user || !user.hashedPassword) {
      return { success: true }
    }

    // Удаляем старые токены для этого email
    await prisma.verification.deleteMany({
      where: {
        OR: [{ identifier: data.email }, { identifier: `reset-pin:${data.email}` }],
      },
    })

    // Создаём новый токен сброса пароля
    const token = generateResetToken()
    const pin = generatePin()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 час

    // Сохраняем токен для ссылки
    await prisma.verification.create({
      data: {
        identifier: data.email,
        value: token,
        expiresAt,
        type: 'PASSWORD_RESET',
      },
    })

    // Сохраняем пинкод отдельно
    await prisma.verification.create({
      data: {
        identifier: `reset-pin:${data.email}`,
        value: pin,
        expiresAt,
        type: 'PASSWORD_RESET_PIN',
      },
    })

    // Формируем ссылку для сброса пароля
    const baseUrl = process.env.BETTER_AUTH_URL || 'https://xn--80aaah6cnh.xn--p1ai'
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    // Отправляем email через @letar/email
    await sendPasswordResetEmail(
      {
        to: user.email,
        userName: user.name ?? undefined,
        resetUrl,
        pin,
      },
      {
        appName: 'НаПрава.РФ',
        headerColor: '#1a365d',
        buttonColor: '#CA9E67',
      }
    )

    return { success: true }
  } catch (error) {
    console.error('Password reset request error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
