'use server'

import { prisma } from '@/lib/db'
import { sendVerificationEmail } from '@letar/email'
import { createTokenManager } from '@letar/pin-auth/server'
import { tokenManagerAdapter } from '../_adapters/pin-auth-adapters'

export type ResendPinResult =
  { success: true } | { success: false; error: 'RATE_LIMITED' | 'NOT_FOUND' | 'ALREADY_VERIFIED' | 'UNKNOWN_ERROR' }

/**
 * Менеджер токенов с настройками для mandala
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

  // Отправляем email с PIN-кодом через @letar/email.
  // ⚠️ sendVerificationEmail НЕ бросает при SMTP-сбое — возвращает { success: false }.
  // Раньше результат игнорировался, и UI показывал «отправлено» даже при провале (§14.2).
  const emailResult = await sendVerificationEmail(
    {
      to: email,
      userName: user?.name ?? undefined,
      pin: result.pin,
    },
    {
      appName: 'Elfafeya Art',
      headerColor: '#8B7355',
      buttonColor: '#A67C52',
    }
  )

  if (!emailResult.success) {
    // Централизованный структурный лог уже сработал в провайдере @letar/email.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[DEV] New verification PIN for ${email}: ${result.pin}`)
    }
    // Честно сообщаем UI о провале — не показываем ложное «письмо отправлено»
    return { success: false, error: 'UNKNOWN_ERROR' }
  }

  return { success: true }
}
