'use server'

import { auth } from '@/lib/auth'
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Better Auth magic link API
    await (auth.api as any).signInMagicLink({
      body: {
        email,
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
