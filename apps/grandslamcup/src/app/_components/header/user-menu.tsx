'use client'

/**
 * Desktop dropdown меню пользователя.
 */

import { signOut } from '@/lib/auth-client'
import { Circle, HStack, Menu, Portal, Separator, Text } from '@chakra-ui/react'
import Link from 'next/link'
import {
  LuCalculator,
  LuChevronDown,
  LuCircleUser,
  LuKeyRound,
  LuLogOut,
  LuMic,
  LuPenLine,
  LuShield,
  LuUserRound,
} from 'react-icons/lu'

interface UserMenuProps {
  userName: string
  isAdmin: boolean
  isCoach: boolean
  isPoet: boolean
  isScorer: boolean
  isPresenter: boolean
}

export function UserMenu({ userName, isAdmin, isCoach, isPoet, isScorer, isPresenter }: UserMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger cursor="pointer">
        <HStack gap={2} px={2} py={1} borderRadius="full" _hover={{ bg: 'bg.subtle' }} transition="background 0.15s">
          <Circle size={7} bg="brand.subtle" color="brand.solid" fontSize="xs" fontWeight="bold">
            {userName.charAt(0).toUpperCase()}
          </Circle>
          <Text
            fontSize="sm"
            fontWeight="medium"
            display={{ base: 'none', lg: 'block' }}
            whiteSpace="nowrap"
            maxW="150px"
            truncate
          >
            {userName}
          </Text>
          <LuChevronDown size={14} />
        </HStack>
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="180px">
            <Menu.Item value="profile" asChild>
              <Link href="/profile">
                <LuCircleUser size={16} />
                Профиль
              </Link>
            </Menu.Item>
            {isAdmin && (
              <Menu.Item value="admin" asChild>
                <Link href="/admin">
                  <LuShield size={16} />
                  Админ-панель
                </Link>
              </Menu.Item>
            )}
            {isCoach && (
              <Menu.Item value="coach" asChild>
                <Link href="/coach">
                  <LuUserRound size={16} />
                  Кабинет тренера
                </Link>
              </Menu.Item>
            )}
            {isPoet && (
              <Menu.Item value="poet" asChild>
                <Link href="/poet">
                  <LuPenLine size={16} />
                  Кабинет поэта
                </Link>
              </Menu.Item>
            )}
            {isScorer && (
              <Menu.Item value="scorer" asChild>
                <Link href="/my/scorer-matches">
                  <LuCalculator size={16} />
                  Кабинет счетовода
                </Link>
              </Menu.Item>
            )}
            {isPresenter && (
              <Menu.Item value="presenter" asChild>
                <Link href="/my/presenter-matches">
                  <LuMic size={16} />
                  Кабинет ведущего
                </Link>
              </Menu.Item>
            )}
            <Menu.Item value="keyholder" asChild>
              <a href="https://auth.letar.best/profile" target="_blank" rel="noopener noreferrer">
                <LuKeyRound size={16} />
                Аккаунт в Ключнице
              </a>
            </Menu.Item>
            <Separator />
            <Menu.Item value="logout" color="fg.muted" onClick={() => signOut()}>
              <LuLogOut size={16} />
              Выйти
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
