'use client'

// Не переведено на @letar/ui UserMenu: его текст захардкожен на русском, а mandala двуязычно
// (ru/en, next-intl) — см. .claude/docs/ui-components.md § UserMenu.
import { Link as LocalizedLink, useRouter } from '@/i18n/navigation'
import { signOut, useSession } from '@/lib/auth-client'
import { Button, Flex, Link, Text } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import NextLink from 'next/link'
import { LuLogIn, LuLogOut, LuSettings } from 'react-icons/lu'

export function AuthButton() {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const t = useTranslations('auth')
  const tNav = useTranslations('nav')

  if (isPending) {
    return null
  }

  if (!session) {
    return (
      <Link asChild>
        <LocalizedLink href="/sign-in">
          <Button size="sm" variant="ghost">
            <LuLogIn />
            <Text display={{ base: 'none', lg: 'inline' }}>{t('signIn')}</Text>
          </Button>
        </LocalizedLink>
      </Link>
    )
  }

  const isAdmin = session.user?.role === 'ADMIN'

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <Flex gap={2} align="center">
      {isAdmin && (
        <Link asChild>
          <NextLink href="/admin">
            <Button size="sm" variant="ghost">
              <LuSettings />
              <Text display={{ base: 'none', lg: 'inline' }}>{tNav('admin')}</Text>
            </Button>
          </NextLink>
        </Link>
      )}
      <Button size="sm" variant="ghost" onClick={handleSignOut}>
        <LuLogOut />
        <Text display={{ base: 'none', lg: 'inline' }}>{t('signOut')}</Text>
      </Button>
    </Flex>
  )
}
