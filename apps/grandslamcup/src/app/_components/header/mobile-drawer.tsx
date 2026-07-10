'use client'

/**
 * Мобильная навигация — Drawer с nav items и user section.
 */

import { logoutAction } from '@/app/_actions/auth.actions'
import { signInWithLetarAuth } from '@/lib/auth-client'
import { Box, CloseButton, Drawer, Flex, Image, Portal, Text, VStack } from '@chakra-ui/react'
import { MobileAuthSection, Pressable } from '@letar/ui'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuMenu, LuPenLine, LuShield, LuUserRound } from 'react-icons/lu'

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
                            <Pressable key={item.href} borderRadius="none">
                              <Link href={item.href} onClick={() => store.setOpen(false)}>
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
                            </Pressable>
                          )
                        })}
                      </VStack>

                      {/* Войти / Юзер — прибито книзу */}
                      <Box borderTopWidth="1px" borderColor="border">
                        <MobileAuthSection
                          session={user ? { name: user.name } : null}
                          onSignIn={() => {
                            signInWithLetarAuth()
                            store.setOpen(false)
                          }}
                          onSignOut={logoutAction}
                          onClose={() => store.setOpen(false)}
                          profileHref="/profile"
                          extraItems={[
                            ...(showAdmin
                              ? [{ value: 'admin', label: 'Админ-панель', href: '/admin', icon: LuShield }]
                              : []),
                            ...(isCoach
                              ? [{ value: 'coach', label: 'Кабинет тренера', href: '/coach', icon: LuUserRound }]
                              : []),
                            ...(isPoet
                              ? [{ value: 'poet', label: 'Кабинет поэта', href: '/poet', icon: LuPenLine }]
                              : []),
                          ]}
                        />
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
