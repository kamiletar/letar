'use server'

import { auth } from '@/lib/auth-config'
import { createLogoutAction } from '@letar/auth/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Server action для выхода из системы
 * Использует shared библиотеку @letar/auth для консистентности
 */
export async function signOutAction() {
  const action = createLogoutAction(auth)
  return action()
}

/**
 * Server action для входа через OAuth провайдер
 */
export async function signInWithProviderAction(provider: 'google' | 'yandex') {
  const response = await auth.api.signInSocial({
    body: {
      provider,
      callbackURL: '/dashboard',
    },
    headers: await headers(),
  })

  if (response.url) {
    redirect(response.url)
  }
}

/**
 * Server action для входа по email/паролю
 */
export async function signInWithEmailAction(email: string, password: string) {
  try {
    const response = await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })

    if (!response.user) {
      return { success: false, error: 'Неверный email или пароль' }
    }

    return { success: true }
  } catch (error) {
    console.error('[SignIn Error]', error)
    return { success: false, error: 'Не удалось выполнить вход' }
  }
}

/**
 * Server action для регистрации по email/паролю
 */
export async function signUpWithEmailAction(name: string, email: string, password: string) {
  try {
    const response = await auth.api.signUpEmail({
      body: {
        name,
        email,
        password,
      },
      headers: await headers(),
    })

    if (!response.user) {
      return { success: false, error: 'Не удалось создать аккаунт' }
    }

    return { success: true }
  } catch (error) {
    console.error('[SignUp Error]', error)

    // Проверяем на дубликат email
    if (error instanceof Error && error.message.includes('unique')) {
      return { success: false, error: 'Пользователь с таким email уже существует' }
    }

    return { success: false, error: 'Не удалось создать аккаунт' }
  }
}
