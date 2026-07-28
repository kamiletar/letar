'use client'

import { signInWithLetarAuth, signOut, useSession } from '@/lib/auth-client'
import type { UserWithRole } from '@/lib/auth.types'
import {
  Box,
  Button,
  CloseButton,
  Container,
  Drawer,
  Flex,
  Heading,
  HStack,
  Icon,
  IconButton,
  Portal,
  Separator,
  VStack,
} from '@chakra-ui/react'
import { CookieSettingsButton, MobileAuthSection, UserMenu } from '@letar/ui'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LuCalendar, LuFilm, LuMenu, LuSettings, LuTrophy } from 'react-icons/lu'

/** Проверяет, активна ли ссылка */
function isActiveRoute(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }
  return pathname.startsWith(href)
}

/** Глобальная навигация с мобильным drawer */
export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as UserWithRole | undefined
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (pathname.startsWith('/watch/')) {
    return null
  }

  const activeLinkProps = (href: string) =>
    isActiveRoute(pathname, href) ? { fontWeight: 'bold' as const, color: 'brand.500' } : {}

  const extraMenuItems = isAdmin ? [{ value: 'admin', label: 'Админ', href: '/admin', icon: LuSettings }] : []

  return (
    <Box borderBottomWidth="1px" borderColor="border.muted" bg="bg">
      <Container maxW="7xl">
        <Flex h="14" align="center" justify="space-between">
          {/* Лого + десктоп навигация */}
          <HStack gap={4}>
            <Button asChild variant="ghost" size="sm" p={1}>
              <NextLink href="/">
                <Icon as={LuFilm} boxSize={5} color="brand.500" />
                <Heading as="span" size="sm" ml={1}>
                  Animatrona
                </Heading>
              </NextLink>
            </Button>

            <HStack gap={1} display={{ base: 'none', md: 'flex' }}>
              <Button asChild variant="ghost" size="sm" {...activeLinkProps('/anime')}>
                <NextLink href="/anime">Аниме</NextLink>
              </Button>
              <Button asChild variant="ghost" size="sm" {...activeLinkProps('/leaderboard')}>
                <NextLink href="/leaderboard">
                  <Icon as={LuTrophy} mr={1} />
                  Лидерборд
                </NextLink>
              </Button>
            </HStack>
          </HStack>

          {/* Десктоп — UserMenu */}
          <HStack gap={2} display={{ base: 'none', md: 'flex' }}>
            <CookieSettingsButton appKey="animatrona-tracker" />
            <UserMenu
              session={session?.user ?? null}
              onSignIn={() => signInWithLetarAuth(pathname)}
              onSignOut={() => signOut()}
              profileHref="/profile"
              extraItems={extraMenuItems}
            />
          </HStack>

          {/* Мобильная кнопка меню */}
          <IconButton
            aria-label="Открыть меню"
            variant="ghost"
            size="sm"
            display={{ base: 'flex', md: 'none' }}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon as={LuMenu} boxSize={5} />
          </IconButton>

          {/* Мобильный Drawer */}
          <Drawer.Root open={drawerOpen} onOpenChange={(e) => setDrawerOpen(e.open)} placement="end">
            <Portal>
              <Drawer.Backdrop />
              <Drawer.Positioner>
                <Drawer.Content>
                  <Drawer.Header borderBottomWidth="1px">
                    <Drawer.Title>Меню</Drawer.Title>
                    <Drawer.CloseTrigger asChild>
                      <CloseButton size="sm" />
                    </Drawer.CloseTrigger>
                  </Drawer.Header>
                  <Drawer.Body>
                    <VStack align="stretch" gap={1} py={2}>
                      <Button
                        asChild
                        variant="ghost"
                        justifyContent="flex-start"
                        size="lg"
                        onClick={() => setDrawerOpen(false)}
                        {...activeLinkProps('/anime')}
                      >
                        <NextLink href="/anime">
                          <Icon as={LuFilm} mr={2} />
                          Аниме
                        </NextLink>
                      </Button>

                      <Button
                        asChild
                        variant="ghost"
                        justifyContent="flex-start"
                        size="lg"
                        onClick={() => setDrawerOpen(false)}
                        {...activeLinkProps('/leaderboard')}
                      >
                        <NextLink href="/leaderboard">
                          <Icon as={LuTrophy} mr={2} />
                          Лидерборд
                        </NextLink>
                      </Button>

                      <Separator my={1} />

                      <MobileAuthSection
                        session={session?.user ?? null}
                        onSignIn={() => signInWithLetarAuth(pathname)}
                        onSignOut={signOut}
                        onClose={() => setDrawerOpen(false)}
                        profileHref="/profile"
                        extraItems={
                          isAdmin ? [{ value: 'admin', label: 'Админ', href: '/admin', icon: LuSettings }] : []
                        }
                      />
                    </VStack>
                  </Drawer.Body>
                </Drawer.Content>
              </Drawer.Positioner>
            </Portal>
          </Drawer.Root>
        </Flex>
      </Container>

      {/* Баннер дозаполнения birthDate */}
      {user && !user.birthDate && !pathname.startsWith('/complete-profile') && (
        <Box bg="orange.subtle" borderBottomWidth="1px" borderColor="orange.muted" py={2}>
          <Container maxW="7xl">
            <Flex align="center" justify="center" gap={2} fontSize="sm">
              <Icon as={LuCalendar} color="orange.fg" />
              <Box color="orange.fg">Укажите дату рождения для доступа ко всему каталогу.</Box>
              <Button asChild size="xs" colorPalette="orange" variant="solid">
                <NextLink href="/complete-profile">Указать</NextLink>
              </Button>
            </Flex>
          </Container>
        </Box>
      )}
    </Box>
  )
}
