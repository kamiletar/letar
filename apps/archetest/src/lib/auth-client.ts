'use client'

import { type AuthClientWithOAuth, createAuthClientWithOAuth } from '@letar/auth/client'

import { toaster } from '@/app/_components/ui/toaster'

/**
 * Клиент авторизации для archetest
 *
 * Использует genericOAuth для входа через ключницу (letar-auth)
 */
export const authClient: AuthClientWithOAuth = createAuthClientWithOAuth()

export const { useSession, signOut } = authClient

/**
 * Войти через ключницу.
 * При ошибке показывает toast пользователю.
 * Возвращает строку ошибки или null при успехе (redirect).
 */
export async function signInWithLetarAuth(): Promise<string | null> {
  try {
    const result = await authClient.signIn.oauth2({
      providerId: 'letar-auth',
      callbackURL: '/',
    })

    if (result?.error) {
      const message = getAuthErrorMessage(result.error.status)
      toaster.create({ type: 'error', title: message })
      return message
    }

    // При успехе произойдёт redirect — сюда не дойдём
    return null
  } catch {
    const message = 'Не удалось подключиться к серверу авторизации. Попробуйте позже'
    toaster.create({ type: 'error', title: message })
    return message
  }
}

/**
 * Человекопонятное сообщение об ошибке авторизации
 */
function getAuthErrorMessage(status?: number): string {
  switch (status) {
    case 429:
      return 'Слишком много попыток входа. Подождите немного и попробуйте снова'
    case 500:
    case 502:
    case 503:
      return 'Сервер авторизации временно недоступен. Попробуйте позже'
    default:
      return 'Не удалось войти. Попробуйте позже'
  }
}
