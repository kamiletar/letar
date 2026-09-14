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
 *
 * Ошибки разбираются по стабильному `body.code` (не по тексту `message`, который
 * может измениться между релизами better-auth) — коды из
 * `better-auth/dist/api/routes/sign-up.mjs`, тот же подход, что в `login.action.ts`.
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
    const apiBody = (error as Record<string, unknown> | null)?.body as Record<string, unknown> | undefined
    const apiCode = (apiBody?.code as string | undefined) ?? ''
    const message = (apiBody?.message as string | undefined) || (error instanceof Error ? error.message : '')
      || 'Неизвестная ошибка'

    if (apiCode === 'USER_ALREADY_EXISTS' || apiCode === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
      return { success: false, error: 'Пользователь с таким email уже существует' }
    }

    if (apiCode === 'PASSWORD_TOO_SHORT' || apiCode === 'PASSWORD_TOO_LONG') {
      return { success: false, error: 'Пароль слишком короткий (минимум 8 символов)' }
    }

    console.error('[auth-hub] signUp error:', message)
    return { success: false, error: 'Ошибка регистрации. Попробуйте позже.' }
  }
}
