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
    // Better Auth бросает APIError: сообщение в body.message, стабильный код — в body.code.
    // Коды определены в @better-auth/core/error/codes.ts (BASE_ERROR_CODES) и не меняются
    // между релизами в отличие от текста message — см. bun cache better-auth/dist/api/routes/sign-in.mjs.
    const apiBody = (error as Record<string, unknown> | null)?.body as Record<string, unknown> | undefined
    const apiCode = (apiBody?.code as string | undefined) ?? ''
    const message = (apiBody?.message as string | undefined) || (error instanceof Error ? error.message : '')
      || 'Неизвестная ошибка'

    console.error('[auth-hub] signIn error full:', { message, apiCode, error })

    // Плагин oidc-provider вешает глобальный after-хук (matcher всегда true),
    // который срабатывает ПОСЛЕ любого эндпоинта, включая sign-in. При prompt=login
    // (принудительный повторный вход — «Войти под другим аккаунтом» в account chooser,
    // см. use-post-sign-in-callback.ts) хук находит cookie oidc_login_prompt +
    // только что установленную сессионную cookie и сам пытается довершить OIDC-flow,
    // вызывая внутренний authorize(ctx). Тот требует ctx.request (сырой Request),
    // а auth.api.signInEmail() из Server Action вызывается как обычная функция —
    // ctx.request не передаётся, authorize() бросает эту OAuth2-форму ошибки (не
    // {code,message}, а {error,error_description}) УЖЕ ПОСЛЕ того как сессия создана.
    // Подтверждено логами прод-инцидента 2026-08-20: createdAt новой сессии в Redis
    // совпадает с меткой времени этой ошибки день-в-день. Пользователь фактически
    // вошёл — просто автозавершение OIDC редиректа не удалось. redirectTo для OIDC-
    // входа — абсолютный URL на /api/auth/oauth2/authorize (usePostSignInCallback),
    // обычный HTTP-переход туда завершит flow штатно, там ctx.request есть.
    if (apiBody?.error === 'invalid_request' && apiBody?.error_description === 'request not found') {
      return { success: true, redirectTo }
    }

    // Если email не верифицирован
    if (apiCode === 'EMAIL_NOT_VERIFIED') {
      // verifyEmailSent → форма покажет кнопку «Отправить письмо повторно» (Этап 2 PLAN.md)
      return {
        success: false,
        verifyEmailSent: true,
        error: 'Подтвердите email для входа. Проверьте почту или отправьте письмо повторно.',
      }
    }

    // Better Auth возвращает один и тот же код INVALID_EMAIL_OR_PASSWORD и для
    // «пользователь не найден», и для «неверный пароль» — сигнатуры sign-in.ts.
    // Пользователь не найден или неверный пароль — пробуем зарегистрировать
    if (apiCode === 'INVALID_EMAIL_OR_PASSWORD') {
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
    const signUpCode = (signUpBody?.code as string | undefined) ?? ''
    const msg = (signUpBody?.message as string | undefined) || (signUpError instanceof Error ? signUpError.message : '')
      || ''

    // Аккаунт существует, но пароль неверный — коды из better-auth/dist/api/routes/sign-up.mjs
    if (signUpCode === 'USER_ALREADY_EXISTS' || signUpCode === 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL') {
      return { success: false, error: 'Неверный пароль' }
    }

    // Слабый пароль
    if (signUpCode === 'PASSWORD_TOO_SHORT' || signUpCode === 'PASSWORD_TOO_LONG') {
      return { success: false, error: 'Пароль слишком короткий (минимум 8 символов)' }
    }

    console.error('[auth-hub] signUp error:', msg)
    return { success: false, error: `Ошибка создания аккаунта: ${msg}` }
  }
}
