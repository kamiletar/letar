'use client'

import { useSession } from '@/lib/auth-client'
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
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LuCalendar, LuFilm, LuKeyRound, LuMenu, LuSettings, LuTrophy, LuUser } from 'react-icons/lu'

/** Проверяет, активна ли ссылка */
function isActiveRoute(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/'
  }
  return pathname.startsWith(href)
}

/** Глобальная навигация с мобильным drawer и active route indicator */
export function Header() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const user = session?.user as UserWithRole | undefined
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MODERATOR'
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Скрываем хедер на странице плеера — там своя навигация
  if (pathname.startsWith('/watch/')) {
    return null
  }

  /** Стиль активной ссылки */
  const activeLinkProps = (href: string) =>
    isActiveRoute(pathname, href) ? { fontWeight: 'bold' as const, color: 'brand.500' } : {}

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

            {/* Десктоп ссылки — скрыты на mobile */}
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

          {/* Десктоп — правая часть */}
          <HStack gap={2} display={{ base: 'none', md: 'flex' }}>
            {isAdmin && (
              <Button asChild variant="outline" size="sm" colorPalette="orange" {...activeLinkProps('/admin')}>
                <NextLink href="/admin">
                  <Icon as={LuSettings} mr={1} />
                  Админ
                </NextLink>
              </Button>
            )}

            {session ? (
              <HStack gap={1}>
                <Button asChild variant="ghost" size="sm" {...activeLinkProps('/profile')}>
                  <NextLink href="/profile">
                    <Icon as={LuUser} mr={1} />
                    {session.user?.name || 'Профиль'}
                  </NextLink>
                </Button>
                <IconButton variant="ghost" size="sm" aria-label="Аккаунт в Ключнице" asChild>
                  <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
                    <Icon as={LuKeyRound} />
                  </a>
                </IconButton>
              </HStack>
            ) : (
              <Button asChild variant="solid" size="sm" colorPalette="brand">
                <NextLink href="/sign-in">Войти</NextLink>
              </Button>
            )}
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

                      {isAdmin && (
                        <Button
                          asChild
                          variant="ghost"
                          justifyContent="flex-start"
                          size="lg"
                          colorPalette="orange"
                          onClick={() => setDrawerOpen(false)}
                        >
                          <NextLink href="/admin">
                            <Icon as={LuSettings} mr={2} />
                            Админ
                          </NextLink>
                        </Button>
                      )}

                      <Box borderTopWidth="1px" my={2} />

                      {session ? (
                        <Button
                          asChild
                          variant="ghost"
                          justifyContent="flex-start"
                          size="lg"
                          onClick={() => setDrawerOpen(false)}
                        >
                          <NextLink href="/profile">
                            <Icon as={LuUser} mr={2} />
                            {session.user?.name || 'Профиль'}
                          </NextLink>
                        </Button>
                      ) : (
                        <Button asChild colorPalette="brand" size="lg" onClick={() => setDrawerOpen(false)}>
                          <NextLink href="/sign-in">Войти</NextLink>
                        </Button>
                      )}
                    </VStack>
                  </Drawer.Body>
                </Drawer.Content>
              </Drawer.Positioner>
            </Portal>
          </Drawer.Root>
        </Flex>
      </Container>

      {/* Баннер дозаполнения birthDate для пользователей без даты рождения */}
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
