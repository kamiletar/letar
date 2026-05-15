'use server'

import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendPasswordResetEmail } from '@letar/email'
import crypto from 'crypto'
import { type ForgotPasswordData, ForgotPasswordSchema } from '../_schemas/forgot-password.schema'

export type RequestPasswordResetResult = { success: true } | { success: false; error: string }

export async function requestPasswordReset(data: ForgotPasswordData): Promise<RequestPasswordResetResult> {
  // 1. Валидация
  const parsed = ForgotPasswordSchema.safeParse(data)
  if (!parsed.success) {
    return { success: false, error: 'Некорректный email' }
  }

  const { email } = parsed.data

  // 2. Проверяем, существует ли пользователь и есть ли у него credential account с паролем
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      accounts: {
        where: { providerId: 'credential' },
        select: { password: true },
      },
    },
  })

  // Безопасность: НЕ раскрываем, существует ли пользователь
  // Всегда возвращаем success, чтобы злоумышленник не мог узнать, есть ли email в базе
  if (!user) {
    logger.info('[Password Reset] User not found:', email)
    // Возвращаем success для безопасности
    return { success: true }
  }

  // Проверяем, есть ли у пользователя credential аккаунт с паролем
  const hasPassword = user.accounts.some((acc: { password: string | null }) => acc.password)
  if (!hasPassword) {
    logger.info('[Password Reset] User has no password (OAuth-only):', email)
    // Возвращаем success для безопасности (не раскрываем информацию)
    return { success: true }
  }

  // 3. Генерируем токен
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now

  // 4. Удаляем старые токены для этого email
  await prisma.verification.deleteMany({
    where: {
      identifier: email,
      type: 'PASSWORD_RESET',
    },
  })

  // 5. Создаем новый токен
  await prisma.verification.create({
    data: {
      identifier: email,
      value: token,
      expiresAt,
      type: 'PASSWORD_RESET',
    },
  })

  // 6. Формируем URL для сброса пароля
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

  // 7. Отправляем email
  try {
    await sendPasswordResetEmail({
      to: user.email!,
      resetUrl,
      userName: user.name || undefined,
    })
    logger.info('[Password Reset] Email sent to:', email)
  } catch (error) {
    logger.error('[Password Reset] Failed to send email:', error)
    // Не показываем ошибку пользователю для безопасности
  }

  // 8. Возвращаем success
  return { success: true }
}
