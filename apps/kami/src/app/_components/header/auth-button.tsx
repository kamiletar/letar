'use client'

import { logoutAction } from '@/app/_actions/auth.actions'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'
import { UserMenu } from '@letar/ui'
import { usePathname } from 'next/navigation'
import { LuSettings } from 'react-icons/lu'

/**
 * Кнопка авторизации для header.
 *
 * Показывает «Войти» для гостей — сразу редиректит на Ключницу без промежуточной страницы.
 * Для авторизованных — UserMenu с профилем, Ключницей и выходом.
 */
export function AuthButton() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const user = session?.user
  const isAdmin = Array.isArray(user?.roles) && user.roles.includes('ADMIN')

  return (
    <UserMenu
      session={user ?? null}
      onSignIn={() => signInWithLetarAuth(pathname)}
      onSignOut={logoutAction}
      profileHref="/profile"
      extraItems={isAdmin ? [{ value: 'admin', label: 'Админка', href: '/admin/', icon: LuSettings }] : []}
    />
  )
}
