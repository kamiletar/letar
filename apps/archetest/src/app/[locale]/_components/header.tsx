'use client'

import { Box, Button, Container, Heading, HStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { useTranslations } from 'next-intl'
import { LuKeyRound, LuLogOut, LuSettings, LuUser } from 'react-icons/lu'

import { Link } from '@/i18n/navigation'
import { signInWithLetarAuth, signOut, useSession } from '@/lib/auth-client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'

import { LanguageSwitcher } from './language-switcher'
import { MobileDrawer } from './mobile-drawer'

/**
 * Шапка сайта — лого, навигация, авторизация, язык
 */
export function Header() {
  const t = useTranslations('nav')
  const tCommon = useTranslations('common')
  const { data: session, isPending } = useSession()
  const { isPsychologist } = useIsPsychologist()

  return (
    <Box as="header" borderBottomWidth="1px" borderColor="border" bg="bg">
      <Container maxW="6xl" py={{ base: 2, md: 3 }}>
        <HStack justify="space-between">
          {/* Лого и навигация */}
          <HStack as="nav" gap={6}>
            <Heading size="md" asChild>
              <Link href="/">{t('home')}</Link>
            </Heading>
            <Button asChild variant="ghost" size="sm" display={{ base: 'none', md: 'inline-flex' }}>
              <Link href="/leaderboard">{t('leaderboard')}</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" display={{ base: 'none', md: 'inline-flex' }}>
              <Link href="/for-professionals">{t('forProfessionals')}</Link>
            </Button>
            {isPsychologist && (
              <Button asChild variant="ghost" size="sm" display={{ base: 'none', md: 'inline-flex' }}>
                <Link href="/cabinet">{t('cabinet')}</Link>
              </Button>
            )}
          </HStack>

          {/* Десктоп: язык + авторизация */}
          <HStack gap={3} display={{ base: 'none', md: 'flex' }}>
            <LanguageSwitcher />
            <ColorModeButton />
            {isPending ? null : session?.user ? (
              <HStack gap={2}>
                <HStack gap={1} color="fg.muted">
                  <LuUser size={14} />
                  <Box fontSize="sm">{session.user.name || session.user.email}</Box>
                </HStack>
                <Button asChild variant="ghost" size="sm" aria-label={t('settings')}>
                  <Link href="/settings">
                    <LuSettings size={14} />
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
                    <LuKeyRound size={14} />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label={tCommon('signOut')}
                  onClick={() => signOut({ fetchOptions: { onSuccess: () => window.location.reload() } })}
                >
                  <LuLogOut size={14} />
                  <Box>{tCommon('signOut')}</Box>
                </Button>
              </HStack>
            ) : (
              <Button onClick={signInWithLetarAuth} variant="outline" size="sm">
                {tCommon('signIn')}
              </Button>
            )}
          </HStack>

          {/* Мобильный: гамбургер-меню */}
          <Box display={{ base: 'flex', md: 'none' }}>
            <MobileDrawer />
          </Box>
        </HStack>
      </Container>
    </Box>
  )
}
