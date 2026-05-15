'use client'

import { Box, HStack, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { useHeaderMobile } from './header-context'

export interface NavItem {
  /** URL ссылки */
  href: string
  /** Текст ссылки */
  label: string
  /** Иконка (опционально) */
  icon?: React.ReactNode
  /** Точное совпадение пути для active */
  exact?: boolean
  /** Badge/счётчик (опционально) */
  badge?: number | string
}

export interface HeaderNavProps {
  /**
   * Массив навигационных элементов
   */
  items: NavItem[]
  /**
   * Режим отображения
   * @default 'desktop'
   */
  mode?: 'desktop' | 'mobile'
  /**
   * Закрывать мобильное меню при клике
   * @default true (для mode='mobile')
   */
  closeOnClick?: boolean
  /**
   * Цветовая схема активного элемента
   * @default 'blue'
   */
  colorPalette?: string
}

/**
 * Навигационные ссылки для Header
 *
 * @example
 * ```tsx
 * const navItems: NavItem[] = [
 *   { href: '/', label: 'Главная', exact: true },
 *   { href: '/catalog', label: 'Каталог' },
 *   { href: '/about', label: 'О нас' },
 * ]
 *
 * <Header.Nav items={navItems} mode="desktop" />
 * ```
 */
export function HeaderNav({
  items,
  mode = 'desktop',
  closeOnClick = mode === 'mobile',
  colorPalette = 'blue',
}: HeaderNavProps) {
  const pathname = usePathname()
  const { close } = useHeaderMobile()

  const isActive = useCallback(
    (item: NavItem) => {
      if (item.exact) {
        return pathname === item.href
      }
      return pathname.startsWith(item.href)
    },
    [pathname]
  )

  const handleClick = useCallback(() => {
    if (closeOnClick) {
      close()
    }
  }, [closeOnClick, close])

  if (mode === 'mobile') {
    return (
      <Box as="nav">
        {items.map((item) => {
          const active = isActive(item)
          return (
            <Box
              key={item.href}
              asChild
              display="flex"
              alignItems="center"
              gap={3}
              py={3}
              px={4}
              borderRadius="md"
              fontWeight={active ? 'semibold' : 'normal'}
              color={active ? `${colorPalette}.600` : 'fg'}
              bg={active ? `${colorPalette}.50` : 'transparent'}
              _hover={{
                bg: active ? `${colorPalette}.100` : 'bg.subtle',
              }}
              transition="all 0.2s"
              onClick={handleClick}
            >
              <Link href={item.href}>
                {item.icon}
                <Text>{item.label}</Text>
                {item.badge !== undefined && (
                  <Box
                    as="span"
                    ml="auto"
                    px={2}
                    py={0.5}
                    fontSize="xs"
                    fontWeight="bold"
                    borderRadius="full"
                    bg={`${colorPalette}.500`}
                    color="white"
                  >
                    {item.badge}
                  </Box>
                )}
              </Link>
            </Box>
          )
        })}
      </Box>
    )
  }

  // Desktop mode
  return (
    <HStack as="nav" gap={1} display={{ base: 'none', md: 'flex' }}>
      {items.map((item) => {
        const active = isActive(item)
        return (
          <Box
            key={item.href}
            asChild
            display="flex"
            alignItems="center"
            gap={2}
            px={3}
            py={2}
            borderRadius="md"
            fontSize="sm"
            fontWeight={active ? 'semibold' : 'medium'}
            color={active ? `${colorPalette}.600` : 'fg.muted'}
            _hover={{
              color: `${colorPalette}.600`,
              bg: 'bg.subtle',
            }}
            transition="all 0.2s"
          >
            <Link href={item.href}>
              {item.icon}
              {item.label}
              {item.badge !== undefined && (
                <Box
                  as="span"
                  px={1.5}
                  py={0.5}
                  fontSize="xs"
                  fontWeight="bold"
                  borderRadius="full"
                  bg={`${colorPalette}.500`}
                  color="white"
                >
                  {item.badge}
                </Box>
              )}
            </Link>
          </Box>
        )
      })}
    </HStack>
  )
}
