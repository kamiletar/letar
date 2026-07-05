'use client'

import { Box, Button, Container, Heading, HStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { UserMenu } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { LuBriefcaseMedical } from 'react-icons/lu'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Link } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'

import { HighContrastToggle } from './high-contrast-toggle'
import { LanguageSwitcher } from './language-switcher'
import { MobileDrawer } from './mobile-drawer'

/**
 * Шапка сайта — лого, навигация, авторизация, язык
 */
export function Header() {
  const t = useTranslations('nav')
  const { data: session } = useSession()
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
              <Link href="/express">{t('express')}</Link>
            </Button>
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
            <HighContrastToggle />
            <ColorModeButton />
            <UserMenu
              session={session?.user ?? null}
              onSignIn={signInWithLetarAuth}
              onSignOut={logoutAction}
              profileHref="/settings"
              extraItems={isPsychologist
                ? [{ value: 'cabinet', label: 'Кабинет', href: '/cabinet', icon: LuBriefcaseMedical }]
                : []}
            />
          </HStack>

          {/* Мобильный: контраст (для планшета на стенде) + гамбургер-меню */}
          <HStack gap={1} display={{ base: 'flex', md: 'none' }}>
            <HighContrastToggle />
            <MobileDrawer />
          </HStack>
        </HStack>
      </Container>
    </Box>
  )
}
