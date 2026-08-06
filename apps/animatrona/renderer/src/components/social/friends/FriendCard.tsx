/**
 * FriendCard — Карточка друга в списке
 *
 * Отображает информацию о друге: аватар, имя, статус онлайн, что смотрит.
 */

'use client'

import {
  Avatar,
  Box,
  HStack,
  IconButton,
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuTrigger,
  Text,
  VStack,
} from '@chakra-ui/react'
import { LuEllipsisVertical, LuUserMinus, LuUserX } from 'react-icons/lu'

import type { Friend } from '../../../../../shared/types/orbitdb'

interface FriendCardProps {
  /** Данные друга */
  friend: Friend
  /** Удалить из друзей */
  onRemove?: (peerId: string) => void
  /** Заблокировать */
  onBlock?: (peerId: string) => void
  /** Открыть профиль */
  onViewProfile?: (peerId: string) => void
}

export function FriendCard({ friend, onRemove, onBlock, onViewProfile }: FriendCardProps) {
  // Генерация инициалов для аватара
  const initials = friend.displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  // Форматирование времени последней активности
  const formatLastSeen = (timestamp: number): string => {
    const now = Date.now()
    const diff = now - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) {
      return 'только что'
    }
    if (minutes < 60) {
      return `${minutes} мин. назад`
    }
    if (hours < 24) {
      return `${hours} ч. назад`
    }
    return `${days} дн. назад`
  }

  return (
    <HStack
      p={3}
      bg="bg.subtle"
      borderRadius="md"
      justify="space-between"
      _hover={{ bg: 'bg.muted' }}
      transition="background 0.2s"
    >
      {/* Аватар и информация */}
      <HStack gap={3} flex={1}>
        <Box position="relative">
          <Avatar.Root size="md">
            {friend.avatarUrl ? <Avatar.Image src={friend.avatarUrl} /> : <Avatar.Fallback>{initials}</Avatar.Fallback>}
          </Avatar.Root>
          {/* Индикатор онлайн */}
          <Box
            position="absolute"
            bottom={0}
            right={0}
            w={3}
            h={3}
            borderRadius="full"
            bg={friend.isOnline ? 'green.500' : 'gray.400'}
            borderWidth={2}
            borderColor="bg.subtle"
          />
        </Box>

        <VStack align="start" gap={0}>
          <Text fontWeight="medium">{friend.displayName}</Text>
          {friend.isOnline
            ? (
              friend.watching
                ? (
                  <Text fontSize="sm" color="blue.500">
                    Смотрит: {friend.watching.animeName} эп. {friend.watching.episodeNumber}
                  </Text>
                )
                : (
                  <Text fontSize="sm" color="green.500">
                    В сети
                  </Text>
                )
            )
            : (
              <Text fontSize="sm" color="fg.muted">
                {formatLastSeen(friend.lastSeenAt)}
              </Text>
            )}
        </VStack>
      </HStack>

      {/* Меню действий */}
      <MenuRoot>
        <MenuTrigger asChild>
          <IconButton aria-label="Меню" variant="ghost" size="sm">
            <LuEllipsisVertical />
          </IconButton>
        </MenuTrigger>
        <MenuContent>
          {onViewProfile && (
            <MenuItem value="profile" onClick={() => onViewProfile(friend.peerId)}>
              Профиль
            </MenuItem>
          )}
          {onRemove && (
            <MenuItem value="remove" onClick={() => onRemove(friend.peerId)}>
              <LuUserMinus />
              Удалить из друзей
            </MenuItem>
          )}
          {onBlock && (
            <MenuItem value="block" color="red.500" onClick={() => onBlock(friend.peerId)}>
              <LuUserX />
              Заблокировать
            </MenuItem>
          )}
        </MenuContent>
      </MenuRoot>
    </HStack>
  )
}
