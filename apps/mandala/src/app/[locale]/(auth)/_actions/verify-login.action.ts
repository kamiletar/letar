'use server'

import { prisma } from '@/lib/db'
import crypto from 'crypto'
import { cookies } from 'next/headers'

/**
 * Server action для авто-логина после верификации PIN
 *
 * Создаёт сессию напрямую в БД, минуя Better Auth API.
 * Это необходимо для credentials flow после PIN верификации.
 * Адаптировано под Better Auth схему.
 */
export async function verifyAndLoginUser(
  email: string,
  verificationToken: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Находим токен (Better Auth: verification.value вместо verificationToken.token)
    const token = await prisma.verification.findUnique({
      where: { value: verificationToken },
    })

    if (!token || token.expiresAt < new Date() || token.identifier !== email) {
      return { success: false, error: 'Токен недействителен или истёк' }
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return { success: false, error: 'Пользователь не найден' }
    }

    // Создаём сессию напрямую в БД (Better Auth формат)
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней

    await prisma.$transaction([
      // Удаляем использованный токен
      prisma.verification.delete({ where: { value: verificationToken } }),
      // Создаём сессию (Better Auth: token вместо sessionToken, expiresAt вместо expires)
      prisma.session.create({
        data: {
          id: crypto.randomUUID(),
          token: sessionToken, // sessionToken → token
          userId: user.id,
          expiresAt, // expires → expiresAt
        },
      }),
    ])

    // Устанавливаем cookie сессии
    const cookieStore = await cookies()
    cookieStore.set('better-auth.session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })

    return { success: true }
  } catch (error) {
    console.error('[verify-login] Error:', error)
    return { success: false, error: 'Ошибка при входе' }
  }
}
