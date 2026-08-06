'use client'

import {
  Button,
  CloseButton,
  Drawer,
  Flex,
  Heading,
  IconButton,
  Link,
  Portal,
  Separator,
  VStack,
} from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { LuExternalLink, LuLogOut, LuMenu } from 'react-icons/lu'
import type { AdminNavItem } from '../types'

interface MobileAdminDrawerProps {
  /** Пункты навигации */
  navItems: AdminNavItem[]
  /** Email пользователя */
  userEmail?: string | null
  /** Server action для logout */
  onLogout: () => Promise<void>
  /** Заголовок админ-панели */
  title?: string
  /** URL основного сайта */
  siteUrl?: string
  /** Базовый URL админ-панели */
  baseUrl?: string
  /** Цветовая палитра */
  colorPalette?: string
}

/**
 * Мобильное меню админ-панели (Drawer слева).
 * Показывается только на мобильных устройствах (base), скрыто на md+.
 */
export function MobileAdminDrawer({
  navItems,
  userEmail,
  onLogout,
  title = 'Админ-панель',
  siteUrl = '/',
  baseUrl = '/admin',
  colorPalette = 'purple',
}: MobileAdminDrawerProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const handleClose = () => setOpen(false)

  return (
    <Drawer.Root placement="start" open={open} onOpenChange={(e) => setOpen(e.open)}>
      {/* Гамбургер-кнопка (только на мобильных) */}
      <Drawer.Trigger asChild>
        <IconButton variant="ghost" aria-label="Открыть меню" display={{ base: 'flex', md: 'none' }} size="lg">
          <LuMenu size={24} />
        </IconButton>
      </Drawer.Trigger>

      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content bg={{ _light: 'white', _dark: 'gray.900' }}>
            <Drawer.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Heading size="md" color="fg">
                {title}
              </Heading>
            </Drawer.Header>

            <Drawer.Body py={4}>
              {/* Навигация */}
              <VStack gap={1} align="stretch">
                {navItems.map((item) => {
                  // Dashboard активен только при точном совпадении
                  const isActive = item.href === baseUrl ? pathname === baseUrl : pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleClose}
                      display="flex"
                      alignItems="center"
                      gap={3}
                      px={4}
                      py={3}
                      borderRadius="md"
                      bg={isActive ? { _light: `${colorPalette}.100`, _dark: `${colorPalette}.900` } : 'transparent'}
                      color={isActive
                        ? { _light: `${colorPalette}.700`, _dark: `${colorPalette}.200` }
                        : { _light: 'gray.600', _dark: 'gray.400' }}
                      fontWeight={isActive ? 'medium' : 'normal'}
                      _hover={{
                        bg: isActive
                          ? { _light: `${colorPalette}.200`, _dark: `${colorPalette}.800` }
                          : { _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' },
                      }}
                      transition="all 0.2s"
                    >
                      <item.icon size={20} />
                      {item.label}
                    </Link>
                  )
                })}
              </VStack>

              <Separator my={4} borderColor="border.subtle" />

              {/* Ссылка на сайт */}
              <Link
                href={siteUrl}
                target="_blank"
                display="flex"
                alignItems="center"
                gap={3}
                px={4}
                py={3}
                borderRadius="md"
                color={{ _light: 'gray.600', _dark: 'gray.400' }}
                _hover={{ bg: { _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' } }}
                transition="all 0.2s"
              >
                <LuExternalLink size={20} />
                Открыть сайт
              </Link>

              <Separator my={4} borderColor="border.subtle" />

              {/* Пользователь и выход */}
              <VStack gap={2} align="stretch" px={4}>
                {userEmail && (
                  <Flex fontSize="sm" color="fg.muted" truncate>
                    {userEmail}
                  </Flex>
                )}
                <form action={onLogout}>
                  <Button type="submit" variant="ghost" colorPalette="red" w="full" justifyContent="flex-start">
                    <LuLogOut />
                    Выход
                  </Button>
                </form>
              </VStack>
            </Drawer.Body>

            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
