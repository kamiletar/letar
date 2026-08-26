'use client'

import { Box, Link, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import type { IconType } from 'react-icons'
import { LuBookOpen, LuKeyboard, LuSettings, LuWrench } from 'react-icons/lu'

interface NavItem {
  label: string
  href: string
  icon: IconType
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Быстрый старт', href: '/docs/quick-start', icon: LuBookOpen },
  { label: 'Горячие клавиши', href: '/docs/keyboard-shortcuts', icon: LuKeyboard },
  { label: 'Профили кодирования', href: '/docs/encoding-profiles', icon: LuSettings },
  { label: 'Решение проблем', href: '/docs/troubleshooting', icon: LuWrench },
]

export function DocsSidebar() {
  const pathname = usePathname()

  return (
    <Box as="nav" position="sticky" top="80px" w={{ base: 'full', md: '250px' }} flexShrink={0} py={4}>
      <VStack align="stretch" gap={1}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase" mb={2} px={3}>
          Документация
        </Text>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href
          const NavIcon = item.icon
          return (
            <Link
              key={item.href}
              asChild
              display="flex"
              alignItems="center"
              gap={3}
              px={3}
              py={2}
              borderRadius="lg"
              fontSize="sm"
              color={isActive ? 'white' : 'gray.400'}
              bg={isActive ? 'brand.500/20' : 'transparent'}
              borderLeft="3px solid"
              borderColor={isActive ? 'brand.500' : 'transparent'}
              transitionProperty="color, background-color, border-color"
              transitionDuration="0.2s"
              _hover={{
                color: 'white',
                bg: 'gray.800',
                textDecoration: 'none',
              }}
            >
              <NextLink href={item.href}>
                <NavIcon size={16} />
                {item.label}
              </NextLink>
            </Link>
          )
        })}
      </VStack>

      {/* Ссылка на главную */}
      <Box mt={8} pt={4} borderTop="1px solid" borderColor="gray.800">
        <Link asChild fontSize="sm" color="gray.500" px={3} _hover={{ color: 'brand.400' }}>
          <NextLink href="/">← Вернуться на главную</NextLink>
        </Link>
      </Box>
    </Box>
  )
}
