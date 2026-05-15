'use client'

import type { UserRole } from '@/generated/prisma'
import { Badge, Box, HStack, Separator, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavigationLinks } from './navigation-links'

interface AppSidebarProps {
  role: UserRole
}

/**
 * Боковое меню (Sidebar) приложения
 * Отображает навигационные ссылки в зависимости от роли пользователя
 * - Role-based навигация
 * - Active link индикация
 * - Sticky position
 * - Скрыто на мобильных устройствах (заменяется MobileMenu)
 */
export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname()
  const navLinks = getNavigationLinks(role)

  return (
    <Box
      as="aside"
      w="260px"
      minH="calc(100vh - 64px)"
      borderRightWidth="1px"
      borderColor="gray.200"
      position="sticky"
      top="64px"
      display={{ base: 'none', lg: 'block' }}
      bg="white"
      _dark={{ borderColor: 'gray.700', bg: 'gray.800' }}
    >
      <VStack align="stretch" gap={0} py={4}>
        {navLinks.map((link, index) => {
          const Icon = link.icon
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/')

          // Добавляем разделитель после определенных секций
          const showSeparator =
            (role === 'CLIENT' && (index === 1 || index === 2 || index === 5)) ||
            (role === 'SPECIALIST' && (index === 1 || index === 5)) ||
            (role === 'ADMIN' && (index === 1 || index === 4))

          return (
            <Box key={link.href}>
              <Box asChild>
                <NextLink href={link.href}>
                  <HStack
                    px={4}
                    py={3}
                    gap={3}
                    bg={isActive ? 'fg.50' : 'transparent'}
                    color={isActive ? 'fg.700' : 'gray.700'}
                    _dark={{
                      bg: isActive ? 'fg.900' : 'transparent',
                      color: isActive ? 'fg.300' : 'gray.300',
                    }}
                    _hover={{
                      bg: isActive ? 'fg.100' : 'gray.100',
                      _dark: {
                        bg: isActive ? 'fg.800' : 'gray.700',
                      },
                    }}
                    transition="all 0.2s"
                    cursor="pointer"
                    borderLeftWidth={isActive ? '4px' : '0'}
                    borderLeftColor="fg.500"
                    position="relative"
                  >
                    <Icon size={20} />
                    <Text fontSize="sm" fontWeight={isActive ? 'semibold' : 'normal'}>
                      {link.label}
                    </Text>
                    {link.badge && (
                      <Badge colorPalette="red" size="xs" ml="auto">
                        {link.badge}
                      </Badge>
                    )}
                  </HStack>
                </NextLink>
              </Box>

              {showSeparator && <Separator my={2} />}
            </Box>
          )
        })}
      </VStack>
    </Box>
  )
}
