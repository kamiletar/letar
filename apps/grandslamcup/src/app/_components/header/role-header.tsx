'use client'

/**
 * Общий хедер кабинетов (admin/coach/poet) с мобильным Drawer-меню.
 * Различия между ролями — цветовая палитра, набор пунктов навигации и правая часть хедера.
 */

import { Box, CloseButton, Container, Drawer, Flex, IconButton, Portal, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuMenu } from 'react-icons/lu'

export interface RoleHeaderNavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface RoleHeaderProps {
  /** Полный заголовок раздела слева от гамбургера */
  title: string
  /** Короткий заголовок для узких экранов — если не задан, `title` рендерится без breakpoint-варианта */
  shortTitle?: string
  /** Заголовок в шапке Drawer на мобильных */
  drawerTitle: string
  /** Цветовая палитра активного пункта меню и заголовка Drawer */
  colorPalette: 'brand' | 'teal'
  /** Пункты навигации кабинета */
  navItems: RoleHeaderNavItem[]
  /** Href корня раздела — для него активность проверяется точным совпадением, а не `startsWith` */
  rootHref: string
  /** Правая часть хедера — имя пользователя/команды и доп. ссылки */
  rightContent: React.ReactNode
}

export function RoleHeader(
  { title, shortTitle, drawerTitle, colorPalette, navItems, rootHref, rightContent }: RoleHeaderProps,
) {
  const pathname = usePathname()
  const activeBg = `${colorPalette}.subtle`
  const activeFg = `${colorPalette}.fg`

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
                        <Drawer.Title fontWeight="bold" color={activeFg}>
                          {drawerTitle}
                        </Drawer.Title>
                      </Drawer.Header>
                      <Drawer.Body p={0}>
                        <Drawer.Context>
                          {(store) => (
                            <VStack gap={0} align="stretch">
                              {navItems.map((item) => {
                                const IconComponent = item.icon
                                const isActive = item.href === rootHref
                                  ? pathname === rootHref
                                  : pathname.startsWith(item.href)

                                return (
                                  <Link key={item.href} href={item.href} onClick={() => store.setOpen(false)}>
                                    <Flex
                                      align="center"
                                      gap={3}
                                      px={5}
                                      py={3.5}
                                      minH="48px"
                                      bg={isActive ? activeBg : 'transparent'}
                                      color={isActive ? activeFg : 'fg'}
                                      fontWeight={isActive ? 'semibold' : 'normal'}
                                      _hover={{ bg: isActive ? activeBg : 'bg.subtle' }}
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
            {shortTitle
              ? (
                <>
                  <Text fontSize="sm" color="fg.muted" display={{ base: 'none', sm: 'block' }}>
                    {title}
                  </Text>
                  <Text fontSize="sm" color="fg.muted" fontWeight="semibold" display={{ base: 'block', sm: 'none' }}>
                    {shortTitle}
                  </Text>
                </>
              )
              : (
                <Text fontSize="sm" color="fg.muted">
                  {title}
                </Text>
              )}
          </Flex>
          <Flex align="center" gap={4} flexShrink={0}>
            {rightContent}
          </Flex>
        </Flex>
      </Container>
    </Box>
  )
}
