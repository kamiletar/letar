'use client'

import { Box, Link as ChakraLink, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { profileNavItems } from './profile-nav-items'

/**
 * Боковая навигация профиля пользователя.
 * Отображает ссылки на различные разделы профиля с активным состоянием.
 */
export function ProfileSidebar() {
  const pathname = usePathname()

  return (
    <Box
      as="nav"
      position="sticky"
      top={4}
      bg="bg.panel"
      borderWidth="1px"
      borderRadius="lg"
      p={4}
      height="fit-content"
    >
      <VStack align="stretch" gap={1}>
        {profileNavItems.map((item) => {
          // Для корневого пути /profile и ссылок вне /profile (например /cart) - только точное совпадение
          // Для остальных внутри /profile - точное совпадение или начинается с href (для вложенных маршрутов)
          const isActive =
            item.href === '/profile' || !item.href.startsWith('/profile')
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <ChakraLink
              key={item.href}
              asChild
              display="flex"
              alignItems="center"
              gap={3}
              px={4}
              py={3}
              borderRadius="md"
              fontWeight={isActive ? 'semibold' : 'normal'}
              color={isActive ? 'fg.500' : 'fg.muted'}
              bg={isActive ? 'fg.100' : 'transparent'}
              _hover={{
                bg: isActive ? 'fg.100' : 'bg.muted',
                color: isActive ? 'fg.600' : 'fg',
                textDecoration: 'none',
              }}
              transition="all 0.2s"
            >
              <NextLink href={item.href}>
                <Box as="span" fontSize="lg">
                  {item.icon}
                </Box>
                {item.label}
              </NextLink>
            </ChakraLink>
          )
        })}
      </VStack>
    </Box>
  )
}
