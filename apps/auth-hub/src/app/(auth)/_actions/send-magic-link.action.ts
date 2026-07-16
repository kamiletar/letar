'use server'

import { auth } from '@/lib/auth'
import { resolveLoginEmail } from '@/lib/resolve-login-email'
import { headers } from 'next/headers'

interface MagicLinkResult {
  success: boolean
  error?: string
}

/**
 * Server Action для отправки magic link
 */
export async function sendMagicLinkAction(email: string, callbackUrl?: string): Promise<MagicLinkResult> {
  try {
    // Вход по linked-email (Этап 8.5): резолвим в основной адрес ДО Better Auth.
    // Без резолва magic link с disableSignUp:false молча создал бы дубль-аккаунт
    // с linked-адресом. Побочный эффект: письмо уходит на ОСНОВНОЙ адрес владельца
    // (оба адреса принадлежат одному пользователю, оба подтверждены).
    const { email: loginEmail } = await resolveLoginEmail(email)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth magic link API
    await (auth.api as any).signInMagicLink({
      body: {
        email: loginEmail,
        callbackURL: callbackUrl || '/',
      },
      headers: await headers(),
    })

    return { success: true }
  } catch {
    // Не раскрываем, существует ли пользователь (безопасность)
    return { success: true }
  }
}
