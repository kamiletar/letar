'use client'

import { Box, Link, Stack, Tooltip } from '@chakra-ui/react'
import { usePathname } from 'next/navigation'
import type { AdminNavItem } from '../types'

interface AdminNavProps {
  /** Пункты навигации */
  navItems: AdminNavItem[]
  /** Свёрнутый режим (только иконки) */
  collapsed?: boolean
  /** Базовый URL админ-панели (по умолчанию '/admin') */
  baseUrl?: string
  /** Цветовая палитра (по умолчанию 'purple') */
  colorPalette?: string
}

/**
 * Навигация админ-панели с подсветкой активного пункта
 */
export function AdminNav({ navItems, collapsed = false, baseUrl = '/admin', colorPalette = 'purple' }: AdminNavProps) {
  const pathname = usePathname()

  return (
    <Stack gap={1}>
      {navItems.map((item) => {
        // Dashboard активен только при точном совпадении
        // Остальные пункты — при начале пути
        const isActive = item.href === baseUrl ? pathname === baseUrl : pathname.startsWith(item.href)

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            display="flex"
            alignItems="center"
            justifyContent={{ base: 'center', md: collapsed ? 'center' : 'flex-start' }}
            gap={3}
            px={3}
            py={2}
            borderRadius="md"
            bg={isActive ? { _light: `${colorPalette}.100`, _dark: `${colorPalette}.900` } : undefined}
            color={
              isActive
                ? { _light: `${colorPalette}.700`, _dark: `${colorPalette}.200` }
                : { _light: 'gray.600', _dark: 'gray.400' }
            }
            fontWeight={isActive ? 'medium' : 'normal'}
            _hover={{
              bg: isActive
                ? { _light: `${colorPalette}.200`, _dark: `${colorPalette}.800` }
                : { _light: 'blackAlpha.100', _dark: 'whiteAlpha.100' },
              color: isActive
                ? { _light: `${colorPalette}.800`, _dark: `${colorPalette}.100` }
                : { _light: 'gray.900', _dark: 'white' },
            }}
            transition="all 0.2s"
          >
            <item.icon size={20} />
            <Box display={{ base: 'none', md: collapsed ? 'none' : 'block' }} transition="opacity 0.2s">
              {item.label}
            </Box>
          </Link>
        )

        // В collapsed режиме показываем tooltip с названием
        if (collapsed) {
          return (
            <Tooltip.Root key={item.href} positioning={{ placement: 'right' }} openDelay={0} closeDelay={0}>
              <Tooltip.Trigger asChild>{linkContent}</Tooltip.Trigger>
              <Tooltip.Positioner>
                <Tooltip.Content>{item.label}</Tooltip.Content>
              </Tooltip.Positioner>
            </Tooltip.Root>
          )
        }

        return linkContent
      })}
    </Stack>
  )
}
