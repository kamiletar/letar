'use server'

import { auth } from '@/lib/auth'
import { resolveLoginEmail } from '@/lib/resolve-login-email'
import { headers } from 'next/headers'

interface LoginInput {
  email: string
  password: string
  callbackUrl?: string
}

interface LoginResult {
  success: boolean
  error?: string
  redirectTo?: string
  /** Был ли создан новый аккаунт */
  created?: boolean
  /** Аккаунт создан, но требуется верификация email */
  verifyEmailSent?: boolean
}

/**
 * Server Action для входа по email/password
 *
 * Если аккаунт не существует — автоматически создаёт его.
 */
export async function loginUser(data: LoginInput): Promise<LoginResult> {
  const reqHeaders = await headers()
  const redirectTo = data.callbackUrl || '/'

  // Вход по любому подтверждённому linked-email (Этап 8.5): резолвим в основной
  // адрес ДО Better Auth. resolved=true дополнительно защищает от дубль-регистрации
  // ниже: без резолва «user not found» по linked-адресу уводил бы в trySignUp и
  // молча создавал второй аккаунт с этим email.
  const { email: loginEmail, resolved } = await resolveLoginEmail(data.email)

  try {
    // Попытка входа
    await auth.api.signInEmail({
      body: {
        email: loginEmail,
        password: data.password,
        callbackURL: redirectTo,
      },
      headers: reqHeaders,
    })

    return { success: true, redirectTo }
  } catch (error) {
    // Better Auth бросает APIError: реальное сообщение в body.message, code в body.code
    const apiBody = (error as Record<string, unknown> | null)?.body as Record<string, unknown> | undefined
    const apiCode = (apiBody?.code as string | undefined) ?? ''
    const message =
      (apiBody?.message as string | undefined) || (error instanceof Error ? error.message : '') || 'Неизвестная ошибка'

    console.error('[auth-hub] signIn error full:', { message, apiCode, error })

    // Если email не верифицирован
    const lowerMsg = (message + apiCode).toLowerCase()
    if (
      lowerMsg.includes('email_not_verified') ||
      lowerMsg.includes('not verified') ||
      lowerMsg.includes('email not verified')
    ) {
      // verifyEmailSent → форма покажет кнопку «Отправить письмо повторно» (Этап 2 PLAN.md)
      return {
        success: false,
        verifyEmailSent: true,
        error: 'Подтвердите email для входа. Проверьте почту или отправьте письмо повторно.',
      }
    }

    // Если пользователь не найден или неверный пароль — пробуем зарегистрировать
    const lowerMessage = message.toLowerCase()
    if (
      lowerMessage.includes('invalid') ||
      lowerMessage.includes('user not found') ||
      lowerMessage.includes('credential account not found') ||
      lowerMessage.includes('invalid_email_or_password') ||
      lowerMessage.includes('user_not_found') ||
      lowerMessage.includes('invalid_credentials')
    ) {
      // Email резолвился из linked-адреса → аккаунт точно существует, пароль неверный.
      // trySignUp здесь создал бы дубль-аккаунт с linked-адресом в качестве основного.
      if (resolved) {
        return { success: false, error: 'Неверный пароль' }
      }
      return await trySignUp(data, reqHeaders, redirectTo)
    }

    console.error('[auth-hub] signIn error:', message)
    return { success: false, error: `Ошибка входа: ${message}` }
  }
}

/**
 * Попытка автоматической регистрации и входа
 */
async function trySignUp(data: LoginInput, reqHeaders: Headers, redirectTo: string): Promise<LoginResult> {
  try {
    // Регистрация (autoSignIn: true в конфиге Better Auth)
    const signUpRes = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.email.split('@')[0] ?? '',
        callbackURL: redirectTo,
      },
      headers: reqHeaders,
    })

    // В проде стоит requireEmailVerification=true → autoSignIn НЕ создаёт сессию
    // (см. apps/auth-hub/src/lib/auth.ts: emailAndPassword.requireEmailVerification).
    // Без этой проверки фронт получал success=true и пытался редиректить на
    // /api/auth/oauth2/authorize → endpoint видел отсутствие сессии и кидал
    // обратно на /sign-in, а LoginForm не сбрасывал loading → крутилка вечно.
    const session = (signUpRes as { token?: string | null } | null)?.token
    if (!session) {
      return {
        success: false,
        verifyEmailSent: true,
        error: 'Аккаунт создан. Мы отправили ссылку для подтверждения на вашу почту — перейдите по ней, чтобы войти.',
      }
    }

    return { success: true, redirectTo, created: true }
  } catch (signUpError) {
    const signUpBody = (signUpError as Record<string, unknown> | null)?.body as Record<string, unknown> | undefined
    const msg =
      (signUpBody?.message as string | undefined) || (signUpError instanceof Error ? signUpError.message : '') || ''

    // Аккаунт существует, но пароль неверный
    if (msg.includes('already exists') || msg.includes('USER_ALREADY_EXISTS')) {
      return { success: false, error: 'Неверный пароль' }
    }

    // Слабый пароль
    if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('min'))) {
      return { success: false, error: 'Пароль слишком короткий (минимум 8 символов)' }
    }

    console.error('[auth-hub] signUp error:', msg)
    return { success: false, error: `Ошибка создания аккаунта: ${msg}` }
  }
}
