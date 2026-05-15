'use client'

import { UserAvatar } from '@/app/_components/user-avatar'
import type { UserRole } from '@/generated/prisma'
import {
  Badge,
  Box,
  DrawerBackdrop,
  DrawerBody,
  DrawerCloseTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerRoot,
  DrawerTrigger,
  HStack,
  IconButton,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { LuMenu, LuX } from 'react-icons/lu'
import { getNavigationLinks } from './navigation-links'

interface MobileMenuProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
    role: UserRole
  }
}

// Маппинг ролей на русский язык
const roleLabels: Record<UserRole, string> = {
  CLIENT: 'Клиент',
  SPECIALIST: 'Специалист',
  ADMIN: 'Администратор',
}

// Цвета для badge ролей
const roleColors: Record<UserRole, string> = {
  CLIENT: 'blue',
  SPECIALIST: 'green',
  ADMIN: 'red',
}

/**
 * Мобильное меню (Drawer)
 * Отображает навигацию в боковом меню для мобильных устройств
 */
export function MobileMenu({ user }: MobileMenuProps) {
  const pathname = usePathname()
  const navLinks = getNavigationLinks(user.role)

  return (
    <DrawerRoot placement="start" size="xs">
      <DrawerTrigger asChild>
        <IconButton aria-label="Открыть меню" variant="ghost" size="sm" display={{ base: 'flex', lg: 'none' }}>
          <LuMenu />
        </IconButton>
      </DrawerTrigger>

      <DrawerBackdrop />

      <DrawerContent>
        <DrawerHeader borderBottomWidth="1px">
          <HStack justify="space-between">
            <Text fontSize="lg" fontWeight="semibold">
              Меню
            </Text>
            <DrawerCloseTrigger asChild>
              <IconButton aria-label="Закрыть меню" variant="ghost" size="sm">
                <LuX />
              </IconButton>
            </DrawerCloseTrigger>
          </HStack>
        </DrawerHeader>

        <DrawerBody p={0}>
          {/* User Info */}
          <Box p={4} borderBottomWidth="1px">
            <HStack gap={3}>
              <UserAvatar name={user.name} image={user.image} size="md" />
              <VStack align="flex-start" gap={1}>
                <Text fontSize="sm" fontWeight="semibold">
                  {user.name || 'Пользователь'}
                </Text>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  {user.email}
                </Text>
                <Badge colorPalette={roleColors[user.role]} size="xs" variant="subtle">
                  {roleLabels[user.role]}
                </Badge>
              </VStack>
            </HStack>
          </Box>

          {/* Navigation Links */}
          <VStack align="stretch" gap={0} py={2}>
            {navLinks.map((link) => {
              const Icon = link.icon
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/')

              return (
                <Box key={link.href} asChild>
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
              )
            })}
          </VStack>
        </DrawerBody>
      </DrawerContent>
    </DrawerRoot>
  )
}
