import { getSession } from '@/lib/auth'
import { SignInButtonClient } from './sign-in-button-client'

export { SignInButtonClient as SignInButton }

/**
 * Кнопка «Войти» в шапке.
 *
 * ⚠️ Реализована как Server Component через `getSession()` — симметрично
 * `<UserMenu />`. Раньше использовала `<OnlyFor userRole="UNAUTHORIZED">`
 * с client-side `useSession()`, и при рассинхронизации server-cookie ↔
 * client-fetch на странице оказывались сразу обе: имя пользователя из
 * UserMenu (server) И кнопка «Войти» (client) — UX-баг.
 */
export async function AuthButton() {
  const session = await getSession()

  if (session?.user) {
    return null
  }

  return <SignInButtonClient />
}
