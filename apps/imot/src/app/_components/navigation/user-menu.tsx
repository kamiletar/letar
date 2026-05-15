'use client'

import { signOutAction } from '@/app/_actions/auth.actions'
import { ColorModeButton } from '@/app/_components/ui/color-mode'
import { UserAvatar } from '@/app/_components/user-avatar'
import type { UserRole } from '@/generated/prisma'
import {
  Badge,
  Box,
  HStack,
  MenuContent,
  MenuItem,
  MenuPositioner,
  MenuRoot,
  MenuSeparator,
  MenuTrigger,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { LuLogOut, LuSettings, LuUser } from 'react-icons/lu'

interface UserMenuProps {
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
 * Меню пользователя с аватаром и выпадающим списком опций
 * Отображает профиль, настройки, переключатель темы и кнопку выхода
 */
export function UserMenu({ user }: UserMenuProps) {
  async function handleSignOut() {
    await signOutAction()
  }

  return (
    <MenuRoot positioning={{ placement: 'bottom-end' }}>
      <MenuTrigger asChild>
        <HStack
          gap={2}
          cursor="pointer"
          px={2}
          py={1}
          borderRadius="md"
          _hover={{ bg: 'gray.100', _dark: { bg: 'gray.700' } }}
          transition="background 0.2s"
        >
          <UserAvatar name={user.name} image={user.image} size="sm" />
          <Box display={{ base: 'none', md: 'block' }}>
            <VStack gap={0} align="flex-start">
              <Text fontSize="sm" fontWeight="medium" lineHeight="1.2">
                {user.name || 'Пользователь'}
              </Text>
              <Badge colorPalette={roleColors[user.role]} size="xs" variant="subtle">
                {roleLabels[user.role]}
              </Badge>
            </VStack>
          </Box>
        </HStack>
      </MenuTrigger>

      <Portal>
        <MenuPositioner>
          <MenuContent minW="250px">
            {/* Header с информацией о пользователе */}
            <Box px={3} py={2}>
              <VStack gap={1} align="flex-start">
                <Text fontSize="sm" fontWeight="semibold">
                  {user.name || 'Пользователь'}
                </Text>
                <Text fontSize="xs" color="gray.600" _dark={{ color: 'gray.400' }}>
                  {user.email}
                </Text>
                <Badge colorPalette={roleColors[user.role]} size="xs" variant="outline">
                  {roleLabels[user.role]}
                </Badge>
              </VStack>
            </Box>

            <MenuSeparator />

            {/* Профиль */}
            <MenuItem asChild value="profile">
              <NextLink href="/profile">
                <HStack gap={2}>
                  <LuUser />
                  <Text>Профиль</Text>
                </HStack>
              </NextLink>
            </MenuItem>

            {/* Настройки */}
            <MenuItem asChild value="settings">
              <NextLink href="/profile/edit">
                <HStack gap={2}>
                  <LuSettings />
                  <Text>Настройки</Text>
                </HStack>
              </NextLink>
            </MenuItem>

            <MenuSeparator />

            {/* Переключатель темы */}
            <Box px={3} py={2}>
              <HStack justify="space-between">
                <Text fontSize="sm">Тёмная тема</Text>
                <ColorModeButton />
              </HStack>
            </Box>

            {/* Уведомления (будущее) */}
            {/*
            <MenuItem value="notifications" disabled>
              <HStack gap={2}>
                <LuBell />
                <Text>Уведомления</Text>
                <Badge colorPalette="red" size="xs" ml="auto">
                  3
                </Badge>
              </HStack>
            </MenuItem>
            */}

            <MenuSeparator />

            {/* Выход */}
            <MenuItem value="signout" color="red.600" _dark={{ color: 'red.400' }} onClick={handleSignOut}>
              <HStack gap={2}>
                <LuLogOut />
                <Text>Выйти</Text>
              </HStack>
            </MenuItem>
          </MenuContent>
        </MenuPositioner>
      </Portal>
    </MenuRoot>
  )
}
