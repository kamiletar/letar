'use client'

import { OAuthButtons } from '@/lib/auth-client'

type Provider = 'google' | 'github' | 'facebook' | 'vk' | 'yandex'

/** Все доступные OAuth-провайдеры (по умолчанию — без гео-ограничений) */
const ALL_PROVIDERS: Provider[] = ['google', 'github', 'facebook', 'vk', 'yandex']

interface AuthOAuthButtonsProps {
  /**
   * Список разрешённых провайдеров. Передаётся из Server Component после
   * гео-проверки (для RU-IP исключены google/github/facebook — 149-ФЗ).
   */
  providers?: Provider[]
}

/**
 * OAuth кнопки для входа через соцсети.
 *
 * Всегда редиректят на /auth/post-login — промежуточный route, который
 * читает cookie `oidc_pending` (установленную на /sign-in если была OIDC
 * сессия) и продолжает OIDC flow. Без cookie просто идёт на главную.
 */
export function AuthOAuthButtons({ providers = ALL_PROVIDERS }: AuthOAuthButtonsProps) {
  return providers.length === 0 ? null : <OAuthButtons providers={providers} callbackUrl="/auth/post-login" />
}
