'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getClientIp } from '@letar/demo-protection'
import { createHmac } from 'crypto'
import { cookies, headers } from 'next/headers'

/**
 * Server action для авто-логина после верификации PIN
 *
 * Создаёт сессию через сам Better Auth (`internalAdapter.createSession`), а не напрямую в БД в
 * обход его — иначе формат записи/срок жизни могут разойтись с обычным входом.
 *
 * ⚠️ Cookie ставится строго с именем/атрибутами/секретом из контекста Better Auth
 * (`auth.$context`), а значение — В ПОДПИСАННОМ формате `<token>.<HMAC-SHA256(secret, token)>`
 * (`signCookieValue` из better-call). `getSession()` читает cookie через `getSignedCookie` и
 * требует именно эту подпись — сырой токен без неё сессию не распознаёт. За https
 * (BETTER_AUTH_URL) имя cookie ещё и с префиксом `__Secure-` — захардкоженное имя без него не
 * читалось бы вовсе.
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

    // `pin !== null` означает, что PIN ещё не был введён верно — эта запись ещё не прошла
    // через updateTokenForAutoLogin (который её обнуляет). Без этой проверки server action
    // (публично вызываемый эндпоинт) давал бы вход по одному только знанию исходного
    // токена регистрационной ссылки, минуя проверку PIN целиком.
    if (!token || token.expiresAt < new Date() || token.identifier !== email || token.pin !== null) {
      return { success: false, error: 'Токен недействителен или истёк' }
    }

    // Находим пользователя
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return { success: false, error: 'Пользователь не найден' }
    }

    // Удаляем использованный токен — одноразовый, повторное предъявление должно быть отклонено
    await prisma.verification.delete({ where: { value: verificationToken } })

    const headersObj = await headers()
    const ctx = await auth.$context

    const session = await ctx.internalAdapter.createSession(user.id, false, {
      ipAddress: await getClientIp(),
      userAgent: headersObj.get('user-agent'),
    })

    const { name, attributes } = ctx.authCookies.sessionToken
    const signature = createHmac('sha256', ctx.secret).update(session.token).digest('base64')

    const cookieStore = await cookies()
    cookieStore.set(name, `${session.token}.${signature}`, {
      httpOnly: attributes.httpOnly,
      secure: attributes.secure,
      sameSite: String(attributes.sameSite ?? 'lax').toLowerCase() as 'lax' | 'strict' | 'none',
      path: attributes.path ?? '/',
      domain: attributes.domain,
      expires: session.expiresAt,
    })

    return { success: true }
  } catch (error) {
    console.error('[verify-login] Error:', error)
    return { success: false, error: 'Ошибка при входе' }
  }
}
