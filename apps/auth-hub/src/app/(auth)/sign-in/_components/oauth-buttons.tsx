'use client'

import { OAuthButtons } from '@/lib/auth-client'

/**
 * OAuth кнопки для входа через соцсети.
 *
 * Всегда редиректят на /auth/post-login — промежуточный route, который
 * читает cookie `oidc_pending` (установленную на /sign-in если была OIDC
 * сессия) и продолжает OIDC flow. Без cookie просто идёт на главную.
 *
 * Ранее использовался usePostSignInCallback() для передачи OIDC authorize
 * URL как callbackUrl, но этот URL с вложенными query-параметрами не
 * выживал в цепочке редиректов через внешний OAuth (двойное кодирование
 * спецсимволов). Cookie-подход решает эту проблему.
 */
export function AuthOAuthButtons() {
  // Facebook добавлен — настроен в auth.ts с тех пор как kami перешёл на Ключницу (Этап 6)
  return <OAuthButtons providers={['google', 'github', 'facebook', 'vk', 'yandex']} callbackUrl="/auth/post-login" />
}
