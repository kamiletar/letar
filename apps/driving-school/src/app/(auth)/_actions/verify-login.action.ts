'use server'

import { prisma } from '@/lib/db'
import { createHmac, randomBytes } from 'crypto'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'

interface VerifyLoginData {
  email: string
  verificationToken: string
}

type VerifyLoginResult =
  | { success: true; redirectTo: string }
  | { success: false; error: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'USER_NOT_FOUND' | 'UNKNOWN_ERROR' }

/**
 * Подписать токен секретом Better Auth (HMAC-SHA256)
 * Формат better-call: btoa(HMAC-SHA-256(secret, value))
 */
function signToken(token: string): string {
  const secret = process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error('AUTH_SECRET or BETTER_AUTH_SECRET is not set')
  }
  // Используем base64 (не base64url) для совместимости с better-call
  return createHmac('sha256', secret).update(token).digest('base64')
}

/**
 * Server Action для автоматического входа после верификации email
 * Создаёт сессию напрямую и устанавливает подписанный cookie
 */
export async function verifyAndLoginUser(data: VerifyLoginData): Promise<VerifyLoginResult> {
  try {
    const { email, verificationToken } = data

    // Находим пользователя
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return { success: false, error: 'USER_NOT_FOUND' }
    }

    // Проверяем verificationToken
    const verification = await prisma.verification.findUnique({
      where: { value: verificationToken },
    })

    if (!verification || verification.identifier !== email) {
      return { success: false, error: 'INVALID_TOKEN' }
    }

    // Проверяем срок действия
    if (verification.expiresAt < new Date()) {
      await prisma.verification.delete({ where: { value: verificationToken } })
      return { success: false, error: 'EXPIRED_TOKEN' }
    }

    // Удаляем использованный токен
    await prisma.verification.delete({ where: { value: verificationToken } })

    // Создаём session token (32 bytes = 256 bits)
    const sessionToken = randomBytes(32).toString('base64url')

    // Срок действия сессии - 7 дней
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Получаем IP и User-Agent
    const headersObj = await headers()
    const ipAddress = headersObj.get('x-forwarded-for')?.split(',')[0]?.trim() || null
    const userAgent = headersObj.get('user-agent') || null

    // Создаём сессию в БД с правильными именами полей
    await prisma.session.create({
      data: {
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress,
        userAgent,
      },
    })

    // Подписываем токен и устанавливаем cookie
    const signature = signToken(sessionToken)
    const cookieValue = `${sessionToken}.${signature}`

    const cookieStore = await cookies()
    cookieStore.set('better-auth.session_token', cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: expiresAt,
    })

    return { success: true, redirectTo: '/onboarding' }
  } catch (error) {
    console.error('[VerifyLogin] Error:', error)
    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}

/**
 * Server Action для входа с редиректом
 * Используется когда нужно гарантированно установить cookie перед навигацией
 */
export async function verifyAndLoginWithRedirect(data: VerifyLoginData): Promise<never> {
  const result = await verifyAndLoginUser(data)

  if (result.success) {
    redirect(result.redirectTo)
  } else {
    redirect('/sign-in')
  }
}
