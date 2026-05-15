/**
 * FriendsList — Список друзей
 *
 * Отображает список друзей с возможностью поиска и фильтрации.
 */

'use client'

import { Box, Button, Heading, HStack, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuSearch, LuUserPlus, LuUsers } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

import { useFriends } from '../../../hooks/useFriends'
import { AddFriendDialog } from './AddFriendDialog'
import { FriendCard } from './FriendCard'

interface FriendsListProps {
  /** Показать только онлайн */
  onlineOnly?: boolean
  /** Заголовок секции */
  title?: string
}

export function FriendsList({ onlineOnly = false, title = 'Друзья' }: FriendsListProps) {
  const { friends, isLoading, error, removeFriend, blockUser, refreshFriends } = useFriends()
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Фильтрация друзей
  const filteredFriends = useMemo(() => {
    let result = friends

    // Фильтр по онлайн
    if (onlineOnly) {
      result = result.filter((f) => f.isOnline)
    }

    // Фильтр по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (f) => f.displayName.toLowerCase().includes(query) || f.friendCode.toLowerCase().includes(query)
      )
    }

    // Сортировка: онлайн сверху, затем по имени
    return result.sort((a, b) => {
      if (a.isOnline !== b.isOnline) {
        return b.isOnline ? 1 : -1
      }
      return a.displayName.localeCompare(b.displayName)
    })
  }, [friends, onlineOnly, searchQuery])

  // Обработчики действий
  const handleRemoveFriend = async (peerId: string) => {
    const friend = friends.find((f) => f.peerId === peerId)
    const success = await removeFriend(peerId)

    if (success) {
      toaster.success({
        title: 'Удалено из друзей',
        description: friend?.displayName,
      })
    } else {
      toaster.error({ title: 'Не удалось удалить' })
    }
  }

  const handleBlockUser = async (peerId: string) => {
    const friend = friends.find((f) => f.peerId === peerId)
    const success = await blockUser(peerId)

    if (success) {
      toaster.success({
        title: 'Пользователь заблокирован',
        description: friend?.displayName,
      })
    } else {
      toaster.error({ title: 'Не удалось заблокировать' })
    }
  }

  // Состояния загрузки и ошибки
  if (isLoading) {
    return (
      <VStack py={8}>
        <Spinner size="lg" />
        <Text color="fg.muted">Загрузка списка друзей...</Text>
      </VStack>
    )
  }

  if (error) {
    return (
      <VStack py={8}>
        <Text color="red.500">{error}</Text>
        <Button size="sm" onClick={refreshFriends}>
          Повторить
        </Button>
      </VStack>
    )
  }

  return (
    <Box>
      {/* Заголовок и кнопка добавления */}
      <HStack justify="space-between" mb={4}>
        <HStack>
          <LuUsers />
          <Heading size="md">{title}</Heading>
          <Text color="fg.muted">({filteredFriends.length})</Text>
        </HStack>
        <Button size="sm" colorPalette="blue" onClick={() => setIsAddDialogOpen(true)}>
          <LuUserPlus />
          Добавить
        </Button>
      </HStack>

      {/* Поиск */}
      {friends.length > 5 && (
        <Box mb={4}>
          <Input
            placeholder="Поиск по имени или коду..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
      )}

      {/* Список друзей */}
      {filteredFriends.length === 0 ? (
        <VStack py={8} color="fg.muted">
          {friends.length === 0 ? (
            <>
              <LuUsers size={48} />
              <Text>У вас пока нет друзей</Text>
              <Button size="sm" colorPalette="blue" onClick={() => setIsAddDialogOpen(true)}>
                Добавить первого друга
              </Button>
            </>
          ) : (
            <>
              <LuSearch size={32} />
              <Text>Ничего не найдено</Text>
            </>
          )}
        </VStack>
      ) : (
        <VStack gap={2} align="stretch">
          {filteredFriends.map((friend) => (
            <FriendCard key={friend.peerId} friend={friend} onRemove={handleRemoveFriend} onBlock={handleBlockUser} />
          ))}
        </VStack>
      )}

      {/* Диалог добавления друга */}
      <AddFriendDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onRequestSent={refreshFriends}
      />
    </Box>
  )
}
