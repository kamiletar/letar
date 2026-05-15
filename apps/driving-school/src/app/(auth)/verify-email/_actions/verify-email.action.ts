'use server'

import { getAppUrl } from '@/lib/app-url'
import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@letar/email'
import crypto from 'crypto'

export type VerifyEmailResult =
  | { success: true; email: string; autoLoginToken: string }
  | { success: false; error: 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'ALREADY_VERIFIED' | 'UNKNOWN_ERROR' }

/**
 * Генерация токена для авто-логина
 */
function generateAutoLoginToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Server action для верификации email по токену
 */
export async function verifyEmailAction(token: string): Promise<VerifyEmailResult> {
  try {
    // Находим токен верификации
    const verification = await prisma.verification.findUnique({
      where: { value: token },
    })

    if (!verification) {
      return { success: false, error: 'TOKEN_NOT_FOUND' }
    }

    // Проверяем срок действия токена
    if (verification.expiresAt < new Date()) {
      // Удаляем просроченный токен
      await prisma.verification.delete({
        where: { value: token },
      })
      return { success: false, error: 'TOKEN_EXPIRED' }
    }

    // Находим пользователя по email (identifier)
    const user = await prisma.user.findUnique({
      where: { email: verification.identifier },
    })

    if (!user) {
      return { success: false, error: 'TOKEN_NOT_FOUND' }
    }

    // Проверяем, не верифицирован ли уже email
    if (user.emailVerified) {
      // Удаляем токен, так как он больше не нужен
      await prisma.verification.delete({
        where: { value: token },
      })
      return { success: false, error: 'ALREADY_VERIFIED' }
    }

    // Генерируем токен для авто-логина
    const autoLoginToken = generateAutoLoginToken()
    const autoLoginExpires = new Date(Date.now() + 5 * 60 * 1000) // 5 минут

    // Обновляем статус верификации и создаём токен для авто-логина в транзакции
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
      // Удаляем старый токен
      prisma.verification.delete({
        where: { value: token },
      }),
      // Создаём новый токен для авто-логина
      prisma.verification.create({
        data: {
          identifier: verification.identifier,
          value: autoLoginToken,
          expiresAt: autoLoginExpires,
          type: 'AUTO_LOGIN',
        },
      }),
    ])

    return { success: true, email: verification.identifier, autoLoginToken }
  } catch (error) {
    console.error('Email verification error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Повторная отправка письма верификации
 */
export type ResendVerificationResult =
  | { success: true }
  | { success: false; error: 'USER_NOT_FOUND' | 'ALREADY_VERIFIED' | 'RATE_LIMITED' | 'UNKNOWN_ERROR' }

export async function resendVerificationEmailAction(email: string): Promise<ResendVerificationResult> {
  try {
    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' }
    }

    // Проверяем, не верифицирован ли уже email
    if (user.emailVerified) {
      return { success: false, error: 'ALREADY_VERIFIED' }
    }

    // Проверяем, не отправляли ли мы письмо недавно (rate limiting)
    const existingToken = await prisma.verification.findFirst({
      where: {
        identifier: email,
        type: 'EMAIL_VERIFICATION',
        // Токен создан менее 2 минут назад
        expiresAt: {
          gt: new Date(Date.now() + 24 * 60 * 60 * 1000 - 2 * 60 * 1000),
        },
      },
    })

    if (existingToken) {
      return { success: false, error: 'RATE_LIMITED' }
    }

    // Удаляем старые токены для этого email
    await prisma.verification.deleteMany({
      where: { identifier: email, type: 'EMAIL_VERIFICATION' },
    })

    // Создаём новый токен
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 часа

    await prisma.verification.create({
      data: {
        identifier: email,
        value: token,
        expiresAt,
        type: 'EMAIL_VERIFICATION',
      },
    })

    // Отправляем email (асинхронно, не блокируем ответ)
    const appUrl = getAppUrl()
    const verificationUrl = `${appUrl}/verify-email?token=${token}`

    // Отправляем без await чтобы не блокировать
    sendVerificationEmail({
      to: email,
      userName: user.name || '',
      verificationUrl,
    }).catch((error: unknown) => {
      console.error('Failed to send verification email:', error)
    })

    return { success: true }
  } catch (error) {
    console.error('Resend verification error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
