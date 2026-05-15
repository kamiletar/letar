'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

type SendMagicLinkResult =
  | { success: true }
  | { success: false; error: 'USER_NOT_FOUND' | 'EMAIL_NOT_VERIFIED' | 'SEND_FAILED' | 'UNKNOWN_ERROR' }

/**
 * Server Action для отправки Magic Link
 *
 * Использует Better Auth magicLink плагин для отправки ссылки входа.
 * Email отправляется через sendMagicLink callback в auth.ts.
 */
export async function sendMagicLinkAction(email: string, callbackUrl = '/'): Promise<SendMagicLinkResult> {
  try {
    // Better Auth magic link API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (auth.api as any).signInMagicLink({
      body: {
        email,
        callbackURL: callbackUrl,
      },
      headers: await headers(),
    })

    return { success: true }
  } catch (error) {
    console.error('[Magic Link] Error:', error)

    // Better Auth бросает исключения при ошибках
    const message = error instanceof Error ? error.message : ''

    if (message.includes('User not found') || message.includes('no user')) {
      // Для безопасности возвращаем success, чтобы не раскрывать существующие email
      return { success: true }
    }

    if (message.includes('Email not verified')) {
      return { success: false, error: 'EMAIL_NOT_VERIFIED' }
    }

    if (message.includes('Failed to send') || message.includes('email error')) {
      return { success: false, error: 'SEND_FAILED' }
    }

    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
