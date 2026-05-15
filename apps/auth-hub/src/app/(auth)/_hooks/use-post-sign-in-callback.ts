'use client'

import { useSearchParams } from 'next/navigation'

/**
 * Определяет URL для редиректа после успешного входа на странице /sign-in.
 *
 * Если страница открыта как часть OIDC authorization_code flow
 * (Better Auth OIDC Provider редиректит неавторизованного пользователя
 * на loginPage со всеми OAuth 2.0 параметрами — client_id, redirect_uri,
 * response_type, state, code_challenge и т.д.), возвращаем АБСОЛЮТНЫЙ URL
 * на внутренний /api/auth/oauth2/authorize?<исходная query>. После успешного
 * логина Better Auth сделает redirect на этот URL, authorize endpoint найдёт
 * свежую сессию и продолжит OIDC flow до зарегистрированного redirect_uri
 * клиентского приложения.
 *
 * ⚠️ Используем абсолютный URL (`window.location.origin + path`), а НЕ
 * относительный путь. Better Auth для magic-link верификации делает
 * `decodeURIComponent(callbackURL)` и валидирует через regex
 * `^\/(?!\/|\\|%2f|%5c)[\w\-.\+/@]*(?:\?[\w\-.\+/=&%@]*)?$`. Этот regex
 * для query string разрешает только `\w-.+/=&%@` — двоеточие НЕ входит.
 * После декодирования `redirect_uri=https%3A%2F%2F...` превращается в
 * `redirect_uri=https://...` с сырым `:` → regex падает → INVALID_CALLBACK_URL.
 * Абсолютный URL обходит этот regex и валидируется по `trustedOrigins`,
 * куда `baseURL` (auth.letar.best) попадает по умолчанию.
 *
 * Иначе используем явный callbackUrl параметр или дефолт '/'.
 */
export function usePostSignInCallback(): string {
  const searchParams = useSearchParams()
  const clientId = searchParams.get('client_id')
  const redirectUri = searchParams.get('redirect_uri')
  const responseType = searchParams.get('response_type')

  // Все три параметра обязательны в корректном OIDC authorize запросе —
  // их одновременное наличие надёжно идентифицирует OIDC flow
  if (clientId && redirectUri && responseType) {
    // SSR fallback: на сервере window недоступен, hydration перерисует
    // с правильным origin до того как пользователь нажмёт submit
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/api/auth/oauth2/authorize?${searchParams.toString()}`
  }

  return searchParams.get('callbackUrl') ?? '/'
}
