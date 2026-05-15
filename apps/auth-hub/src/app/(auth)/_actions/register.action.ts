'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

interface RegisterInput {
  email: string
  password: string
  name?: string
}

interface RegisterResult {
  success: boolean
  email?: string
  error?: string
}

/**
 * Server Action для регистрации
 */
export async function registerUser(data: RegisterInput): Promise<RegisterResult> {
  try {
    await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.name || data.email.split('@')[0],
      },
      headers: await headers(),
    })

    return { success: true, email: data.email }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка'

    if (message.includes('already') || message.includes('exist')) {
      return { success: false, error: 'Пользователь с таким email уже существует' }
    }

    return { success: false, error: 'Ошибка регистрации. Попробуйте позже.' }
  }
}
