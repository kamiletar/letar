'use server'

import { auth } from '@/lib/auth'
import { resolveLoginEmail } from '@/lib/resolve-login-email'
import { headers } from 'next/headers'
import { z } from 'zod/v4'

interface MagicLinkResult {
  success: boolean
  error?: string
}

interface MagicLinkApi {
  signInMagicLink(input: {
    body: { email: string; callbackURL: string; newUserCallbackURL: string; errorCallbackURL?: string }
    headers: Headers
  }): Promise<unknown>
}

/** Сбой доставки одинаков для новых и существующих адресов и не выдаёт их наличие. */
export async function sendMagicLinkAction(
  email: string,
  callbackUrl = '/',
  errorCallbackUrl?: string,
): Promise<MagicLinkResult> {
  if (!z.email().safeParse(email).success) { return { success: false, error: 'Проверьте адрес почты.' } }
  try {
    const { email: loginEmail } = await resolveLoginEmail(email)
    // Фабрика hub-provider не сохраняет литеральные типы дополнительных плагинов.
    await (auth.api as unknown as MagicLinkApi).signInMagicLink({
      body: {
        email: loginEmail,
        callbackURL: callbackUrl,
        newUserCallbackURL: callbackUrl,
        errorCallbackURL: errorCallbackUrl,
      },
      headers: await headers(),
    })
    return { success: true }
  } catch {
    return {
      success: false,
      error: 'Не удалось отправить письмо. Попробуйте ещё раз позже или войдите другим способом.',
    }
  }
}
