'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { type LoginFormData, LoginSchema } from '../_schemas/login.schema'

export type LoginResult =
  | { success: true }
  | { success: false; error: 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR' }

/**
 * Server action для входа пользователя через Better Auth
 */
export async function loginUser(data: LoginFormData & { callbackUrl?: string }): Promise<LoginResult> {
  try {
    // Валидация
    const parsed = LoginSchema.safeParse(data)
    if (!parsed.success) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    const { email, password } = parsed.data

    // Выполняем вход через Better Auth
    await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    })

    return { success: true }
  } catch (error) {
    console.error('[Login] Error:', error)

    // Better Auth бросает исключения при ошибках
    const message = error instanceof Error ? error.message : ''

    if (message.includes('Invalid credentials') || message.includes('Invalid email or password')) {
      return { success: false, error: 'INVALID_CREDENTIALS' }
    }
    if (message.includes('Email not verified')) {
      return { success: false, error: 'EMAIL_NOT_VERIFIED' }
    }

    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
