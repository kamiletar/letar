'use client'

import { Box, Button, Heading, HStack, IconButton, Link, Tooltip, VStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuExternalLink, LuLogOut } from 'react-icons/lu'
import type { AdminNavItem } from '../types'
import { AdminNav } from './admin-nav'

interface AdminSidebarProps {
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
 * Сворачиваемый sidebar для админ-панели.
 *
 * На мобильных полностью скрыт (используется MobileAdminDrawer),
 * на десктопе можно переключать между развёрнутым и свёрнутым состоянием.
 */
export function AdminSidebar({
  navItems,
  userEmail,
  onLogout,
  title = 'Админ-панель',
  siteUrl = '/',
  baseUrl = '/admin',
  colorPalette = 'purple',
}: AdminSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // На мобильных скрыт полностью (display: none)
  const sidebarWidth = {
    base: '0px',
    md: isCollapsed ? '60px' : '220px',
  }

  return (
    <Box
      as="aside"
      w={sidebarWidth}
      bg={{ _light: 'blackAlpha.50', _dark: 'whiteAlpha.50' }}
      borderRightWidth="1px"
      borderColor="border.subtle"
      py={4}
      flexShrink={0}
      transition="width 0.2s ease-in-out"
      position="relative"
      display={{ base: 'none', md: 'block' }}
    >
      {/* Кнопка сворачивания (только на десктопе) */}
      <IconButton
        aria-label={isCollapsed ? 'Развернуть меню' : 'Свернуть меню'}
        variant="ghost"
        size="xs"
        position="absolute"
        right="-12px"
        top="20px"
        bg="bg.hover"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="full"
        zIndex={10}
        onClick={() => setIsCollapsed(!isCollapsed)}
        display={{ base: 'none', md: 'flex' }}
        _hover={{ bg: 'fg.subtle' }}
      >
        {isCollapsed ? <LuChevronRight size={14} /> : <LuChevronLeft size={14} />}
      </IconButton>

      <VStack h="full" justify="space-between" align="stretch">
        {/* Logo / Title */}
        <Box px={{ base: 2, md: isCollapsed ? 2 : 4 }}>
          <HStack justify={{ base: 'center', md: isCollapsed ? 'center' : 'space-between' }} mb={6}>
            <Heading
              size="md"
              color="fg"
              display={{ base: 'none', md: isCollapsed ? 'none' : 'block' }}
              transition="opacity 0.2s"
            >
              {title}
            </Heading>

            {/* Ссылка на основной сайт */}
            <Tooltip.Root positioning={{ placement: 'right' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>
                <IconButton
                  asChild
                  aria-label="Перейти на сайт"
                  variant="ghost"
                  size="sm"
                  colorPalette="gray"
                  _hover={{ bg: 'bg.hover' }}
                >
                  <Link href={siteUrl} target="_blank">
                    <LuExternalLink />
                  </Link>
                </IconButton>
              </Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>Открыть сайт</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          </HStack>

          {/* Navigation */}
          <AdminNav navItems={navItems} collapsed={isCollapsed} baseUrl={baseUrl} colorPalette={colorPalette} />
        </Box>

        {/* User info and logout */}
        <Box px={{ base: 2, md: isCollapsed ? 2 : 4 }} pb={4}>
          <Box
            display={{ base: 'none', md: isCollapsed ? 'none' : 'block' }}
            fontSize="sm"
            color="gray.500"
            mb={2}
            truncate
            transition="opacity 0.2s"
          >
            {userEmail}
          </Box>
          <form action={onLogout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              colorPalette="red"
              w="full"
              justifyContent={{ base: 'center', md: isCollapsed ? 'center' : 'flex-start' }}
            >
              <LuLogOut />
              <Box display={{ base: 'none', md: isCollapsed ? 'none' : 'block' }}>Выход</Box>
            </Button>
          </form>
        </Box>
      </VStack>
    </Box>
  )
}
