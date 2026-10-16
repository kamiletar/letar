'use server'

import { auth } from '@/lib/auth'
import { resolveLoginEmail } from '@/lib/resolve-login-email'
import { headers } from 'next/headers'
import { LoginSchema } from '../_schemas/login.schema'

interface LoginInput {
  email: string
  password: string
  callbackUrl?: string
}

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
  verifyEmailSent?: boolean
}

/** Вход в существующий аккаунт. Ошибка пароля никогда не запускает регистрацию. */
export async function loginUser(data: LoginInput): Promise<LoginResult> {
  const parsed = LoginSchema.safeParse(data)
  if (!parsed.success) { return { success: false, error: 'Проверьте почту и введите пароль.' } }
  const redirectTo = data.callbackUrl || '/'

  try {
    // Подтверждённый связанный адрес ведёт в основной аккаунт, без создания дублей.
    const { email } = await resolveLoginEmail(parsed.data.email)
    await auth.api.signInEmail({
      body: { email, password: parsed.data.password, callbackURL: redirectTo },
      headers: await headers(),
    })
    return { success: true, redirectTo }
  } catch (error) {
    const body = (error as { body?: Record<string, unknown> } | null)?.body
    // OIDC after-hook может потребовать HTTP-продолжение уже после создания сессии.
    if (body?.error === 'invalid_request' && body.error_description === 'request not found') {
      return { success: true, redirectTo }
    }
    if (body?.code === 'EMAIL_NOT_VERIFIED') {
      return {
        success: false,
        verifyEmailSent: true,
        error: 'Подтвердите почту. Проверьте письмо или отправьте его повторно.',
      }
    }
    if (body?.code === 'INVALID_EMAIL_OR_PASSWORD') {
      return { success: false, error: 'Не удалось войти. Проверьте почту и пароль или получите ссылку для входа.' }
    }
    return { success: false, error: 'Не удалось войти. Попробуйте ещё раз позже.' }
  }
}
