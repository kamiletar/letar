'use client'

/**
 * Мобильная навигация — Drawer с nav items и user section.
 */

import { signInWithLetarAuth, signOut } from '@/lib/auth-client'
import { Box, Circle, CloseButton, Drawer, Flex, Image, Portal, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuCircleUser, LuKeyRound, LuLogIn, LuLogOut, LuMenu, LuPenLine, LuShield, LuUserRound } from 'react-icons/lu'

import type { NavItem } from './nav-config'

interface MobileDrawerProps {
  navItems: NavItem[]
  cityPrefix: string
  user: { name?: string | null } | null
  showAdmin: boolean
  isCoach: boolean
  isPoet: boolean
}

export function MobileDrawer({ navItems, cityPrefix, user, showAdmin, isCoach, isPoet }: MobileDrawerProps) {
  const pathname = usePathname()

  if (navItems.length === 0) {
    return null
  }

  return (
    <Box display={{ base: 'flex', md: 'none' }}>
      <Drawer.Root placement="start">
        <Drawer.Trigger aria-label="Открыть меню" cursor="pointer" p={2} borderRadius="md" _hover={{ bg: 'bg.subtle' }}>
          <LuMenu size={24} />
        </Drawer.Trigger>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header borderBottomWidth="1px">
                <Flex align="center" gap={2}>
                  <Image src="/logo.svg" alt="Grand Slam Cup" h={7} w="auto" />
                  <Drawer.Title fontWeight="bold" color="brand.solid">
                    GrandSlam Cup
                  </Drawer.Title>
                </Flex>
              </Drawer.Header>
              <Drawer.Body p={0} display="flex" flexDirection="column">
                <Drawer.Context>
                  {(store) => (
                    <>
                      {/* Навигация */}
                      <VStack gap={0} align="stretch" flex={1}>
                        {navItems.map((item) => {
                          const IconComponent = item.icon
                          const isActive =
                            item.href === '/' || item.href === cityPrefix
                              ? pathname === item.href
                              : pathname.startsWith(item.href)

                          return (
                            <Link key={item.href} href={item.href} onClick={() => store.setOpen(false)}>
                              <Flex
                                align="center"
                                gap={3}
                                px={5}
                                py={3.5}
                                minH="48px"
                                bg={isActive ? 'brand.subtle' : 'transparent'}
                                color={isActive ? 'brand.solid' : 'fg'}
                                fontWeight={isActive ? 'semibold' : 'normal'}
                                _hover={{ bg: isActive ? 'brand.subtle' : 'bg.subtle' }}
                                transition="all 0.15s"
                                borderLeftWidth="3px"
                                borderLeftColor={isActive ? 'brand.solid' : 'transparent'}
                              >
                                <IconComponent size={20} />
                                <Text fontSize="md">{item.label}</Text>
                              </Flex>
                            </Link>
                          )
                        })}
                      </VStack>

                      {/* Войти / Юзер — прибито книзу */}
                      <Box p={4} borderTopWidth="1px" borderColor="border">
                        {user ? (
                          <VStack gap={2} align="stretch">
                            <Flex align="center" gap={2} px={1} py={1}>
                              <Circle size={8} bg="brand.subtle" color="brand.solid" fontSize="sm" fontWeight="bold">
                                {(user.name ?? '?').charAt(0).toUpperCase()}
                              </Circle>
                              <Text fontWeight="medium" fontSize="sm" flex={1}>
                                {user.name}
                              </Text>
                            </Flex>
                            {showAdmin && (
                              <Link href="/admin" onClick={() => store.setOpen(false)}>
                                <Flex
                                  align="center"
                                  gap={2}
                                  px={3}
                                  py={2}
                                  borderRadius="md"
                                  _hover={{ bg: 'bg.subtle' }}
                                >
                                  <LuShield size={16} />
                                  <Text fontSize="sm">Админ-панель</Text>
                                </Flex>
                              </Link>
                            )}
                            <Link href="/profile" onClick={() => store.setOpen(false)}>
                              <Flex align="center" gap={2} px={3} py={2} borderRadius="md" _hover={{ bg: 'bg.subtle' }}>
                                <LuCircleUser size={16} />
                                <Text fontSize="sm">Профиль</Text>
                              </Flex>
                            </Link>
                            {isCoach && (
                              <Link href="/coach" onClick={() => store.setOpen(false)}>
                                <Flex
                                  align="center"
                                  gap={2}
                                  px={3}
                                  py={2}
                                  borderRadius="md"
                                  _hover={{ bg: 'bg.subtle' }}
                                >
                                  <LuUserRound size={16} />
                                  <Text fontSize="sm">Кабинет тренера</Text>
                                </Flex>
                              </Link>
                            )}
                            {isPoet && (
                              <Link href="/poet" onClick={() => store.setOpen(false)}>
                                <Flex
                                  align="center"
                                  gap={2}
                                  px={3}
                                  py={2}
                                  borderRadius="md"
                                  _hover={{ bg: 'bg.subtle' }}
                                >
                                  <LuPenLine size={16} />
                                  <Text fontSize="sm">Кабинет поэта</Text>
                                </Flex>
                              </Link>
                            )}
                            <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
                              <Flex align="center" gap={2} px={3} py={2} borderRadius="md" _hover={{ bg: 'bg.subtle' }}>
                                <LuKeyRound size={16} />
                                <Text fontSize="sm">Аккаунт в Ключнице</Text>
                              </Flex>
                            </a>
                            <Flex
                              align="center"
                              gap={2}
                              px={3}
                              py={2}
                              borderRadius="md"
                              color="fg.muted"
                              cursor="pointer"
                              _hover={{ bg: 'bg.subtle', color: 'fg' }}
                              onClick={() => {
                                signOut()
                                store.setOpen(false)
                              }}
                            >
                              <LuLogOut size={16} />
                              <Text fontSize="sm">Выйти</Text>
                            </Flex>
                          </VStack>
                        ) : (
                          <Flex
                            align="center"
                            gap={3}
                            px={5}
                            py={3.5}
                            minH="48px"
                            borderRadius="lg"
                            bg="brand.solid"
                            color="white"
                            fontWeight="semibold"
                            justify="center"
                            cursor="pointer"
                            onClick={() => {
                              signInWithLetarAuth()
                              store.setOpen(false)
                            }}
                          >
                            <LuLogIn size={20} />
                            <Text fontSize="md">Войти</Text>
                          </Flex>
                        )}
                      </Box>
                    </>
                  )}
                </Drawer.Context>
              </Drawer.Body>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Box>
  )
}
