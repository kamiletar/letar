'use client'

import { useRouter } from '@/i18n/navigation'
import { signOut, useSession } from '@/lib/auth-client'
import { UserMenu } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { LuSettings } from 'react-icons/lu'

export function AuthButton() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const t = useTranslations('auth')
  const tNav = useTranslations('nav')

  if (isPending) {
    return null
  }

  const isAdmin = session?.user?.role === 'ADMIN'

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <UserMenu
      session={session?.user ?? null}
      onSignIn={() => router.push('/sign-in')}
      onSignOut={handleSignOut}
      showAuthHub={false}
      extraItems={isAdmin ? [{ value: 'admin', label: tNav('admin'), href: '/admin', icon: LuSettings }] : []}
      labels={{
        signIn: t('signIn'),
        signOut: t('signOut'),
        fallbackName: t('account'),
        anonymousName: t('account'),
      }}
    />
  )
}
