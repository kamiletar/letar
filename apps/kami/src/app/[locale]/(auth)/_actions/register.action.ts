'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

interface RegisterData {
  name?: string
  email: string
  password: string
}

type RegisterResult =
  | { success: true; email: string }
  | { success: false; error: 'EMAIL_EXISTS' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR' }

/**
 * Server Action для регистрации нового пользователя
 *
 * Использует Better Auth API для создания пользователя.
 * Email верификация отправляется автоматически через настройки в auth.ts.
 */
export async function registerUser(data: RegisterData): Promise<RegisterResult> {
  try {
    // Используем имя из данных или извлекаем из email
    const name = data.name || data.email.split('@')[0]

    await auth.api.signUpEmail({
      body: {
        name,
        email: data.email,
        password: data.password,
      },
      headers: await headers(),
    })

    return { success: true, email: data.email }
  } catch (error) {
    console.error('[Register] Error:', error)

    // Better Auth бросает исключения при ошибках
    const message = error instanceof Error ? error.message : ''

    if (message.includes('User already exists') || message.includes('email already')) {
      return { success: false, error: 'EMAIL_EXISTS' }
    }

    if (message.includes('validation') || message.includes('invalid')) {
      return { success: false, error: 'VALIDATION_ERROR' }
    }

    return { success: false, error: 'UNKNOWN_ERROR' }
  }
}
