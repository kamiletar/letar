'use client'

/**
 * Хедер кабинета поэта с мобильным Drawer-меню
 */

import { Box, CloseButton, Container, Drawer, Flex, IconButton, Portal, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuMenu } from 'react-icons/lu'
import { poetNavItems } from './poet-sidebar'

interface PoetHeaderProps {
  playerName: string
  publicProfileHref: string | null
}

export function PoetHeader({ playerName, publicProfileHref }: PoetHeaderProps) {
  const pathname = usePathname()

  return (
    <Box bg="bg.panel" borderBottomWidth="1px" borderColor="border.muted" py={3} px={4}>
      <Container maxW="full">
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={3}>
            {/* Гамбургер — только на мобильных */}
            <Box display={{ base: 'flex', md: 'none' }}>
              <Drawer.Root placement="start">
                <Drawer.Trigger asChild>
                  <IconButton variant="ghost" size="sm" aria-label="Меню">
                    <LuMenu size={22} />
                  </IconButton>
                </Drawer.Trigger>
                <Portal>
                  <Drawer.Backdrop />
                  <Drawer.Positioner>
                    <Drawer.Content>
                      <Drawer.Header borderBottomWidth="1px">
                        <Drawer.Title fontWeight="bold" color="teal.fg">
                          КБС Поэт
                        </Drawer.Title>
                      </Drawer.Header>
                      <Drawer.Body p={0}>
                        <Drawer.Context>
                          {(store) => (
                            <VStack gap={0} align="stretch">
                              {poetNavItems.map((item) => {
                                const IconComponent = item.icon
                                const isActive = item.href === '/poet'
                                  ? pathname === '/poet'
                                  : pathname.startsWith(item.href)

                                return (
                                  <Link key={item.href} href={item.href} onClick={() => store.setOpen(false)}>
                                    <Flex
                                      align="center"
                                      gap={3}
                                      px={5}
                                      py={3.5}
                                      minH="48px"
                                      bg={isActive ? 'teal.subtle' : 'transparent'}
                                      color={isActive ? 'teal.fg' : 'fg'}
                                      fontWeight={isActive ? 'semibold' : 'normal'}
                                      _hover={{ bg: isActive ? 'teal.subtle' : 'bg.subtle' }}
                                      transitionProperty="background-color, color"
                                      transitionDuration="0.15s"
                                    >
                                      <IconComponent size={20} />
                                      <Text fontSize="md">{item.label}</Text>
                                    </Flex>
                                  </Link>
                                )
                              })}
                            </VStack>
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
            <Text fontSize="sm" color="fg.muted">
              Кубок Большого Слэма — Кабинет поэта
            </Text>
          </Flex>
          <Flex align="center" gap={4}>
            <Text fontSize="sm" fontWeight="semibold" color="teal.fg">
              {playerName}
            </Text>
            {publicProfileHref && (
              <Link href={publicProfileHref}>
                <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                  Мой профиль
                </Text>
              </Link>
            )}
            <Link href="/">
              <Text fontSize="sm" color="brand.fg" _hover={{ textDecoration: 'underline' }}>
                На сайт
              </Text>
            </Link>
          </Flex>
        </Flex>
      </Container>
    </Box>
  )
}
