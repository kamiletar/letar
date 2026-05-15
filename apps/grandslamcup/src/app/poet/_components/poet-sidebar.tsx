'use client'

/**
 * Боковая навигация кабинета поэта
 */

import { Box, Flex, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LuBookOpen, LuHouse, LuUserRound } from 'react-icons/lu'

export interface PoetNavItem {
  href: string
  label: string
  icon: React.ElementType
}

export const poetNavItems: PoetNavItem[] = [
  { href: '/poet', label: 'Дашборд', icon: LuHouse },
  { href: '/poet/poems', label: 'Мои стихи', icon: LuBookOpen },
  { href: '/poet/profile', label: 'Профиль', icon: LuUserRound },
]

export function PoetSidebar() {
  const pathname = usePathname()

  return (
    <Box
      w="220px"
      minH="100vh"
      bg="bg.panel"
      borderRightWidth="1px"
      borderColor="border.muted"
      py={4}
      px={2}
      flexShrink={0}
      display={{ base: 'none', md: 'block' }}
    >
      {/* Логотип */}
      <Flex px={3} py={2} mb={4} align="center" gap={2}>
        <Text fontWeight="bold" fontSize="lg" color="teal.fg">
          КБС
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Поэт
        </Text>
      </Flex>

      {/* Навигация */}
      <VStack gap={1} align="stretch">
        {poetNavItems.map((item) => {
          const IconComponent = item.icon
          const isActive = item.href === '/poet' ? pathname === '/poet' : pathname.startsWith(item.href)

          return (
            <Link key={item.href} href={item.href}>
              <Flex
                align="center"
                gap={3}
                px={3}
                py={2}
                borderRadius="md"
                bg={isActive ? 'teal.subtle' : 'transparent'}
                color={isActive ? 'teal.fg' : 'fg.muted'}
                fontWeight={isActive ? 'semibold' : 'normal'}
                _hover={{ bg: isActive ? 'teal.subtle' : 'bg.subtle' }}
                transition="all 0.15s"
              >
                <IconComponent size={18} />
                <Text fontSize="sm">{item.label}</Text>
              </Flex>
            </Link>
          )
        })}
      </VStack>
    </Box>
  )
}
