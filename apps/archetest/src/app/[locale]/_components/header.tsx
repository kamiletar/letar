'use client'

import { Box, Button, Container, Heading, HStack } from '@chakra-ui/react'
import { ColorModeButton } from '@letar/chakra-provider'
import { UserMenu } from '@letar/ui'
import { useTranslations } from 'next-intl'
import { LuBriefcaseMedical } from 'react-icons/lu'

import { logoutAction } from '@/app/_actions/auth.actions'
import { Link, usePathname } from '@/i18n/navigation'
import { signInWithLetarAuth, useSession } from '@/lib/auth-client'

import { useIsPsychologist } from '@/app/_hooks/use-psychologist'

import { CookieSettingsButton } from './cookie-settings-button'
import { HighContrastToggle } from './high-contrast-toggle'
import { LanguageSwitcher } from './language-switcher'
import { MobileDrawer } from './mobile-drawer'

/** Пункт навигации десктопа с подсветкой текущего раздела */
function NavLink({ href, children, active }: { href: string; children: string; active: boolean }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      display={{ base: 'none', md: 'inline-flex' }}
      color={active ? 'brand.fg' : undefined}
      bg={active ? 'brand.subtle' : undefined}
    >
      <Link href={href} aria-current={active ? 'page' : undefined}>
        {children}
      </Link>
    </Button>
  )
}

/**
 * Шапка сайта — лого, навигация, авторизация, язык
 */
export function Header() {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const { data: session } = useSession()
  const { isPsychologist } = useIsPsychologist()

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Box asChild borderBottomWidth="1px" borderColor="border" bg="bg">
      <header>
        <Container maxW="6xl" py={{ base: 2, md: 3 }}>
          <HStack justify="space-between">
            {/* Лого и навигация */}
            <HStack asChild gap={{ base: 4, lg: 6 }}>
              <nav>
                <Heading size="md" asChild>
                  <Link href="/">{t('home')}</Link>
                </Heading>
                <NavLink href="/express" active={isActive('/express')}>
                  {t('express')}
                </NavLink>
                <NavLink href="/for-professionals" active={isActive('/for-professionals')}>
                  {t('forProfessionals')}
                </NavLink>
                {isPsychologist && (
                  <NavLink href="/cabinet" active={isActive('/cabinet')}>
                    {t('cabinet')}
                  </NavLink>
                )}
              </nav>
            </HStack>

            {/* Десктоп: язык + авторизация */}
            <HStack gap={3} display={{ base: 'none', md: 'flex' }}>
              <CookieSettingsButton />
              <LanguageSwitcher />
              <HighContrastToggle />
              <ColorModeButton aria-label={t('toggleTheme')} title={t('toggleTheme')} />
              <UserMenu
                session={session?.user ?? null}
                onSignIn={() => signInWithLetarAuth()}
                onSignOut={logoutAction}
                profileHref="/settings"
                extraItems={isPsychologist
                  ? [{ value: 'cabinet', label: t('cabinet'), href: '/cabinet', icon: LuBriefcaseMedical }]
                  : []}
              />
            </HStack>

            {
              /* Мобильный: тема + гамбургер-меню. Раньше здесь стояла кнопка контраста с иконкой ◐ —
                её принимали за переключатель темы («темы не различаются», аудит 2026-09-24).
                Контраст теперь — подписанный переключатель в меню */
            }
            <HStack gap={1} display={{ base: 'flex', md: 'none' }}>
              <ColorModeButton aria-label={t('toggleTheme')} />
              <MobileDrawer />
            </HStack>
          </HStack>
        </Container>
      </header>
    </Box>
  )
}
