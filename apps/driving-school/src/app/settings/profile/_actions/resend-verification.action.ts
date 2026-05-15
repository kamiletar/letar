'use server'

import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { sendVerificationEmail } from '@letar/email'
import crypto from 'crypto'

export type ResendVerificationResult =
  | { success: true }
  | { success: false; error: 'NOT_AUTHENTICATED' | 'EMAIL_ALREADY_VERIFIED' | 'RATE_LIMITED' | 'UNKNOWN_ERROR' }

/**
 * Генерация токена верификации email
 */
function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Server action для повторной отправки письма подтверждения email
 */
export async function resendVerificationEmailAction(): Promise<ResendVerificationResult> {
  try {
    const session = await getSession()

    if (!session?.user?.id) {
      return { success: false, error: 'NOT_AUTHENTICATED' }
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем пользователя
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
      },
    })

    if (!user?.email) {
      return { success: false, error: 'UNKNOWN_ERROR' }
    }

    // Проверяем, что email ещё не подтверждён
    if (user.emailVerified) {
      return { success: false, error: 'EMAIL_ALREADY_VERIFIED' }
    }

    // Проверяем rate limit (не чаще 1 раза в 5 минут)
    const existingToken = await db.verification.findFirst({
      where: {
        identifier: user.email,
        expiresAt: { gt: new Date(Date.now() + 23 * 60 * 60 * 1000) }, // Токен создан менее 1 часа назад
      },
    })

    if (existingToken) {
      // Удаляем старые просроченные токены
      await db.verification.deleteMany({
        where: {
          identifier: user.email,
          expiresAt: { lt: new Date() },
        },
      })

      // Проверяем, есть ли активный токен, созданный менее 5 минут назад
      const recentToken = await db.verification.findFirst({
        where: {
          identifier: user.email,
          expiresAt: { gt: new Date(Date.now() + 23 * 60 * 60 * 1000 + 55 * 60 * 1000) }, // Токен создан менее 5 минут назад
        },
      })

      if (recentToken) {
        return { success: false, error: 'RATE_LIMITED' }
      }
    }

    // Удаляем старые токены для этого email
    await db.verification.deleteMany({
      where: { identifier: user.email },
    })

    // Создаём новый токен
    const token = generateVerificationToken()
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа

    await db.verification.create({
      data: {
        identifier: user.email,
        value: token,
        expiresAt: expires,
      },
    })

    // Отправляем email через @letar/email
    const baseUrl = process.env.BETTER_AUTH_URL || 'https://направа.рф'
    const verificationUrl = `${baseUrl}/verify-email/${token}`

    const result = await sendVerificationEmail(
      {
        to: user.email,
        userName: user.name ?? undefined,
        verificationUrl,
      },
      {
        appName: 'НаПрава.РФ',
        headerColor: '#1a365d',
        buttonColor: '#CA9E67',
      }
    )

    if (!result.success) {
      console.error('Failed to send verification email:', result.error)
      return { success: false, error: 'UNKNOWN_ERROR' }
    }

    return { success: true }
  } catch (error) {
    console.error('Resend verification email error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
