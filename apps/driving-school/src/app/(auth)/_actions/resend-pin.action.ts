'use server'

import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@letar/email'
import { createTokenManager } from '@letar/pin-auth/server'
import { tokenManagerAdapter } from '../_adapters/pin-auth-adapters'

export type ResendPinResult =
  | { success: true }
  | { success: false; error: 'RATE_LIMITED' | 'NOT_FOUND' | 'ALREADY_VERIFIED' | 'UNKNOWN_ERROR' }

/**
 * Менеджер токенов с настройками для driving-school
 */
const tokenManager = createTokenManager({
  pinValidityMs: 10 * 60 * 1000, // 10 минут
  linkValidityMs: 24 * 60 * 60 * 1000, // 24 часа
  resendCooldownMs: 60 * 1000, // 60 секунд
  pinLength: 6,
})

/**
 * Server action для повторной отправки PIN-кода верификации
 */
export async function resendVerificationPinAction(email: string): Promise<ResendPinResult> {
  // Получаем имя пользователя для email
  const user = await prisma.user.findUnique({
    where: { email },
    select: { name: true },
  })

  const result = await tokenManager.resendPin(email, tokenManagerAdapter)

  if (!result.success) {
    return { success: false, error: result.error }
  }

  // Отправляем email с PIN-кодом через @letar/email
  try {
    const baseUrl = process.env.BETTER_AUTH_URL || 'https://xn--80aaah6cnh.xn--p1ai'
    const verificationUrl = `${baseUrl}/verify-email/${result.token}`

    await sendVerificationEmail(
      {
        to: email,
        userName: user?.name ?? undefined,
        verificationUrl,
        pin: result.pin,
      },
      {
        appName: 'НаПрава.РФ',
        headerColor: '#1a365d',
        buttonColor: '#CA9E67',
      }
    )
  } catch (emailError) {
    console.error('[Email] Failed to send verification email:', emailError)
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[DEV] New verification PIN for ${email}: ${result.pin}`)
    }
  }

  return { success: true }
}
