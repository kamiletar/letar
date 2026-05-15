'use client'

import { Avatar, Badge, Box, HStack, Input, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { memo, useState } from 'react'
import {
  LuBookOpen,
  LuGlobe,
  LuGraduationCap,
  LuHeadphones,
  LuMessageCircle,
  LuMessageSquare,
  LuSchool,
  LuUsers,
} from 'react-icons/lu'

import type { ChatType } from '@letar/driving-school-db/prisma'
import type { ChatSummary } from '../_services'

interface ChatListProps {
  chats: ChatSummary[]
  activeChatId?: string
}

// Иконка типа чата
function getChatIcon(type: ChatType) {
  switch (type) {
    case 'PRIVATE':
      return LuMessageSquare
    case 'INSTRUCTORS':
    case 'STUDENTS':
      return LuUsers
    case 'SCHOOL':
      return LuSchool
    case 'GENERAL':
      return LuGlobe
    case 'INSTRUCTOR_STUDENTS':
      return LuGraduationCap
    case 'STUDY_GROUP':
      return LuBookOpen
    // Платформенные чаты
    case 'PLATFORM_FEEDBACK':
      return LuMessageCircle
    case 'PLATFORM_SUPPORT':
      return LuHeadphones
    case 'SCHOOL_STUDENT':
      return LuGraduationCap
    default:
      return LuMessageSquare
  }
}

// Название чата
function getChatName(chat: ChatSummary): string {
  if (chat.type === 'PRIVATE' && chat.otherParticipant) {
    return chat.otherParticipant.name || 'Без имени'
  }
  return chat.name || 'Чат'
}

// Аватар чата
function getChatAvatar(chat: ChatSummary): string | null {
  if (chat.type === 'PRIVATE' && chat.otherParticipant) {
    return chat.otherParticipant.image
  }
  return chat.avatar
}

export function ChatList({ chats, activeChatId }: ChatListProps) {
  const [search, setSearch] = useState('')

  const filteredChats = chats.filter((chat) => {
    const name = getChatName(chat).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  return (
    <VStack gap={0} align="stretch" h="full">
      {/* Поиск */}
      <Box p={4} borderBottomWidth={1}>
        <Input placeholder="Поиск чатов..." value={search} onChange={(e) => setSearch(e.target.value)} size="sm" />
      </Box>

      {/* Список чатов */}
      <VStack gap={0} align="stretch" flex={1} overflowY="auto">
        {filteredChats.length === 0 ? (
          <Box p={4} textAlign="center">
            <Text color="fg.muted">{search ? 'Чаты не найдены' : 'У вас пока нет чатов'}</Text>
          </Box>
        ) : (
          filteredChats.map((chat) => <ChatListItem key={chat.id} chat={chat} isActive={chat.id === activeChatId} />)
        )}
      </VStack>
    </VStack>
  )
}

interface ChatListItemProps {
  chat: ChatSummary
  isActive: boolean
}

// Мемоизированный компонент элемента списка чатов
const ChatListItem = memo(function ChatListItem({ chat, isActive }: ChatListItemProps) {
  const Icon = getChatIcon(chat.type)
  const name = getChatName(chat)
  const avatar = getChatAvatar(chat)

  return (
    <Link href={`/chats/${chat.id}`}>
      <HStack
        gap={3}
        p={3}
        cursor="pointer"
        bg={isActive ? 'bg.emphasized' : 'transparent'}
        _hover={{ bg: 'bg.subtle' }}
        transition="background 0.2s"
      >
        {/* Аватар */}
        <Box position="relative">
          {chat.type === 'PRIVATE' ? (
            <Avatar.Root size="md">
              <Avatar.Fallback>{name.charAt(0).toUpperCase()}</Avatar.Fallback>
              {avatar && <Avatar.Image src={avatar} alt={name} />}
            </Avatar.Root>
          ) : (
            <Box
              w={10}
              h={10}
              borderRadius="full"
              bg="bg.emphasized"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon size={20} />
            </Box>
          )}

          {/* Индикатор непрочитанных */}
          {chat.unreadCount > 0 && (
            <Badge position="absolute" top={-1} right={-1} colorPalette="red" borderRadius="full" size="sm">
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </Badge>
          )}
        </Box>

        {/* Информация */}
        <Box flex={1} minW={0}>
          <HStack justify="space-between" mb={1}>
            <Text fontWeight="medium" truncate>
              {name}
            </Text>
            {chat.lastMessageAt && (
              <Text fontSize="xs" color="fg.muted" flexShrink={0}>
                {formatMessageTime(chat.lastMessageAt)}
              </Text>
            )}
          </HStack>

          {chat.lastMessage && (
            <Text fontSize="sm" color="fg.muted" truncate>
              {chat.type !== 'PRIVATE' && (
                <Text as="span" fontWeight="medium">
                  {chat.lastMessage.authorName}:{' '}
                </Text>
              )}
              {chat.lastMessage.content}
            </Text>
          )}
        </Box>
      </HStack>
    </Link>
  )
})

function formatMessageTime(date: Date): string {
  const now = new Date()
  const msgDate = new Date(date)
  const diff = now.getTime() - msgDate.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0) {
    return msgDate.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } else if (days === 1) {
    return 'Вчера'
  } else if (days < 7) {
    return msgDate.toLocaleDateString('ru-RU', { weekday: 'short' })
  } else {
    return msgDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
    })
  }
}
