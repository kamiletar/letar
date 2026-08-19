'use client'

import { Box, CloseButton, Container, Drawer, Flex, IconButton, Portal, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuMenu } from 'react-icons/lu'
import { navItems } from './admin-sidebar'

interface AdminHeaderProps {
  userName: string | null
}

export function AdminHeader({ userName }: AdminHeaderProps) {
  const pathname = usePathname()

  return (
    <Box bg="bg.panel" borderBottomWidth="1px" borderColor="border.muted" py={3} px={4}>
      <Container maxW="full">
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={2}>
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
                        <Drawer.Title fontWeight="bold" color="brand.fg">
                          КБС Админ
                        </Drawer.Title>
                      </Drawer.Header>
                      <Drawer.Body p={0}>
                        <Drawer.Context>
                          {(store) => (
                            <VStack gap={0} align="stretch">
                              {navItems.map((item) => {
                                const IconComponent = item.icon
                                const isActive = item.href === '/admin'
                                  ? pathname === '/admin'
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
                                      color={isActive ? 'brand.fg' : 'fg'}
                                      fontWeight={isActive ? 'semibold' : 'normal'}
                                      _hover={{ bg: isActive ? 'brand.subtle' : 'bg.subtle' }}
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
            <Text fontSize="sm" color="fg.muted" display={{ base: 'none', sm: 'block' }}>
              Кубок Большого Слэма — Админ-панель
            </Text>
            <Text fontSize="sm" color="fg.muted" fontWeight="semibold" display={{ base: 'block', sm: 'none' }}>
              КБС Админ
            </Text>
          </Flex>
          <Flex align="center" gap={3} flexShrink={0}>
            <Text fontSize="sm" color="fg.muted" display={{ base: 'none', md: 'block' }}>
              {userName || 'Администратор'}
            </Text>
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
