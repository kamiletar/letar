'use server'

import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { type SignInFormData, SignInSchema } from '../_schemas/signin.schema'

/** Результат действия входа */
export type SignInActionResult = { success: true } | { success: false; error: string }

/**
 * Server Action для входа в Dashboard
 *
 * Использует Better Auth signIn.username endpoint
 */
export async function signInAction(data: SignInFormData): Promise<SignInActionResult> {
  const parsed = SignInSchema.safeParse(data)

  if (!parsed.success) {
    return { success: false, error: 'Некорректные данные' }
  }

  const { username, password } = parsed.data

  try {
    // Вызываем Better Auth API напрямую на сервере
    const result = await auth.api.signInUsername({
      body: {
        username,
        password,
      },
      headers: await headers(),
    })

    if (!result?.user) {
      return { success: false, error: 'Invalid username or password' }
    }

    // Возвращаем успех — навигация выполняется на клиенте
    // (redirect() из server action вызывает React error #310 при transition)
    return { success: true }
  } catch (error) {
    console.error('[SignIn Error]', error)

    // Better Auth бросает APIError при неверных credentials
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('credentials')) {
        return { success: false, error: 'Invalid username or password' }
      }
    }

    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
