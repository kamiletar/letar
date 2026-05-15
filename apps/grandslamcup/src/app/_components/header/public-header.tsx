'use client'

/**
 * Публичная навигация сайта — city-aware.
 * Оркестратор: собирает DesktopNav, MobileDrawer, UserMenu.
 */

import { signInWithLetarAuth, useSession } from '@/lib/auth-client'
import { isUserAdmin } from '@/lib/session-utils'
import { Box, Container, Flex, Image, Spinner, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuChevronDown } from 'react-icons/lu'

import { PushSubscribeButton } from '../push-subscribe-button'
import { DesktopNav } from './desktop-nav'
import { MobileDrawer } from './mobile-drawer'
import { buildNavItems, CITY_LABELS, extractCitySlug } from './nav-config'
import { useUserMeta } from './use-user-meta'
import { UserMenu } from './user-menu'

export function PublicHeader() {
  const pathname = usePathname()
  const { data: session, isPending } = useSession()
  const citySlug = extractCitySlug(pathname)
  const cityPrefix = citySlug ? `/${citySlug}` : ''

  const isHome = pathname === '/'
  const user = session?.user
  const isAdmin = isUserAdmin(user)
  const { isCoach, isPoet, isOrganizer, isScorer, isPresenter } = useUserMeta(user?.id)
  const showAdmin = !!isAdmin || isOrganizer

  const navItems = buildNavItems(citySlug, isHome)

  return (
    <Box
      borderBottomWidth="1px"
      borderColor="border"
      bg="bg.panel"
      position="sticky"
      top={0}
      zIndex={10}
      shadow="sm"
      asChild
    >
      <header>
        <Container maxW="container.xl">
          <Flex h={16} align="center" justify="space-between" gap={3}>
            {/* Логотип + город */}
            <Flex align="center" gap={3} flexShrink={0}>
              <Link href="/">
                <Flex align="center" gap={2}>
                  <Image src="/logo.svg" alt="Grand Slam Cup" h={9} w="auto" />
                  <Text
                    fontWeight="bold"
                    fontSize="lg"
                    color="brand.solid"
                    display={{ base: 'none', sm: 'block' }}
                    whiteSpace="nowrap"
                  >
                    GrandSlam Cup
                  </Text>
                </Flex>
              </Link>
              {citySlug && (
                <Link href="/">
                  <Flex
                    align="center"
                    gap={1}
                    px={3}
                    py={1}
                    borderRadius="full"
                    bg="brand.subtle"
                    fontSize="xs"
                    fontWeight="medium"
                    color="brand.solid"
                    _hover={{ bg: { base: 'brand.100', _dark: 'brand.900' } }}
                    transition="background 0.15s"
                    title="Сменить город"
                  >
                    {CITY_LABELS[citySlug] ?? citySlug}
                    <LuChevronDown size={14} />
                  </Flex>
                </Link>
              )}
            </Flex>

            {/* Desktop навигация */}
            <DesktopNav navItems={navItems} cityPrefix={cityPrefix} />

            {/* Войти / Юзер — всегда виден */}
            <Flex align="center" gap={1} flexShrink={0}>
              {user && <PushSubscribeButton />}
              {isPending ? (
                <Spinner size="sm" color="fg.muted" />
              ) : user ? (
                <UserMenu
                  userName={user.name ?? 'Пользователь'}
                  isAdmin={showAdmin}
                  isCoach={isCoach}
                  isPoet={isPoet}
                  isScorer={isScorer}
                  isPresenter={isPresenter}
                />
              ) : (
                <Box
                  px={3}
                  py={1.5}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight="medium"
                  bg="brand.solid"
                  color="white"
                  cursor="pointer"
                  _hover={{ bg: 'brand.700' }}
                  transition="background 0.15s"
                  onClick={() => signInWithLetarAuth()}
                >
                  Войти
                </Box>
              )}
            </Flex>

            {/* Мобильная кнопка-гамбургер */}
            <MobileDrawer
              navItems={navItems}
              cityPrefix={cityPrefix}
              user={user ?? null}
              showAdmin={showAdmin}
              isCoach={isCoach}
              isPoet={isPoet}
            />
          </Flex>
        </Container>
      </header>
    </Box>
  )
}
