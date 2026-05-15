'use client'

import { OAuthButtons } from '@/lib/auth-client'
import { usePostSignInCallback } from '../../_hooks/use-post-sign-in-callback'

/**
 * OAuth кнопки для входа через соцсети.
 *
 * callbackUrl определяется через usePostSignInCallback — если страница
 * открыта как часть OIDC flow, после OAuth возврат идёт на внутренний
 * /oauth2/authorize для продолжения выдачи кода клиентскому приложению.
 */
export function AuthOAuthButtons() {
  const callbackUrl = usePostSignInCallback()
  return <OAuthButtons providers={['google', 'github', 'vk', 'yandex']} callbackUrl={callbackUrl} />
}
