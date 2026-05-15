'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

interface LoginData {
  email: string
  password: string
  callbackUrl?: string
}

type LoginResult =
  | { success: true }
  | { success: false; error: 'INVALID_CREDENTIALS' | 'EMAIL_NOT_VERIFIED' | 'UNKNOWN_ERROR' }

/**
 * Server Action для входа по email/паролю
 */
export async function loginUser(data: LoginData): Promise<LoginResult> {
  try {
    await auth.api.signInEmail({
      body: {
        email: data.email,
        password: data.password,
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
