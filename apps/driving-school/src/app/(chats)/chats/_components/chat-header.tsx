'use client'

import { Avatar, Box, HStack, IconButton, Popover, Portal, Spinner, Switch, Text, VStack } from '@chakra-ui/react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuArrowLeft, LuBell, LuBellOff, LuEllipsisVertical, LuUsers } from 'react-icons/lu'

import { isFreelanceInstructor, isModerator, isOwner } from '@/lib/roles'
import type { ChatType } from '@letar/driving-school-db/prisma'
import type { ChatDetails } from '../_services'

// Динамический импорт модального окна для code splitting
const ChatParticipantsModal = dynamic(() => import('./chat-participants-modal').then((m) => m.ChatParticipantsModal), {
  ssr: false,
  loading: () => <Spinner size="sm" />,
})

interface ChatHeaderProps {
  chat: ChatDetails
  currentUserId: string
  onToggleMute?: () => void
  isOtherUserOnline?: boolean
}

// Название чата
function getChatName(chat: ChatDetails, currentUserId: string): string {
  if (chat.type === 'PRIVATE') {
    const other = chat.participants.find((p) => p.userId !== currentUserId)
    return other?.user.name || 'Чат'
  }
  return chat.name || getChatTypeName(chat.type)
}

// Название типа чата
function getChatTypeName(type: ChatType): string {
  switch (type) {
    case 'INSTRUCTORS':
      return 'Чат инструкторов'
    case 'STUDENTS':
      return 'Чат учеников'
    case 'GENERAL':
      return 'Общий чат'
    case 'SCHOOL':
      return 'Чат школы'
    default:
      return 'Чат'
  }
}

// Аватар чата
function getChatAvatar(chat: ChatDetails, currentUserId: string): string | null {
  if (chat.type === 'PRIVATE') {
    const other = chat.participants.find((p) => p.userId !== currentUserId)
    return other?.user.image || null
  }
  return chat.avatar
}

// Подзаголовок
function getChatSubtitle(chat: ChatDetails, currentUserId: string): string {
  if (chat.type === 'PRIVATE') {
    const other = chat.participants.find((p) => p.userId !== currentUserId)
    if (other) {
      const roles = other.user.roles
      // Показываем главную роль (в порядке приоритета)
      if (isOwner(roles)) {
        return 'Владелец платформы'
      }
      if (isModerator(roles)) {
        return 'Модератор'
      }
      if (isFreelanceInstructor(roles)) {
        return 'Инструктор'
      }
      // Базовый пользователь
      return 'Пользователь'
    }
    return ''
  }
  return `${chat.participants.length} участников`
}

export function ChatHeader({ chat, currentUserId, onToggleMute, isOtherUserOnline }: ChatHeaderProps) {
  const router = useRouter()
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false)
  const name = getChatName(chat, currentUserId)
  const avatar = getChatAvatar(chat, currentUserId)
  const subtitle = getChatSubtitle(chat, currentUserId)

  return (
    <HStack gap={3} p={4} borderBottomWidth={1} bg="bg.panel">
      {/* Кнопка назад (для мобильных) */}
      <IconButton
        aria-label="Назад"
        variant="ghost"
        display={{ base: 'flex', md: 'none' }}
        onClick={() => router.push('/chats')}
      >
        <LuArrowLeft />
      </IconButton>

      {/* Аватар */}
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
          <LuUsers size={20} />
        </Box>
      )}

      {/* Название и подзаголовок */}
      <Box flex={1}>
        <HStack gap={2}>
          <Text fontWeight="medium">{name}</Text>
          {chat.type === 'PRIVATE' && isOtherUserOnline && (
            <Box w={2} h={2} borderRadius="full" bg="success.solid" title="Онлайн" />
          )}
        </HStack>
        {subtitle && (
          <Text
            fontSize="sm"
            color="fg.muted"
            cursor={chat.type !== 'PRIVATE' ? 'pointer' : 'default'}
            _hover={chat.type !== 'PRIVATE' ? { textDecoration: 'underline' } : undefined}
            onClick={() => {
              if (chat.type !== 'PRIVATE') {
                setIsParticipantsOpen(true)
              }
            }}
          >
            {subtitle}
          </Text>
        )}
      </Box>

      {/* Меню */}
      <Popover.Root>
        <Popover.Trigger asChild>
          <IconButton aria-label="Настройки чата" variant="ghost">
            <LuEllipsisVertical />
          </IconButton>
        </Popover.Trigger>
        <Portal>
          <Popover.Positioner>
            <Popover.Content w="200px" p={2}>
              <VStack gap={0} align="stretch">
                {/* Уведомления */}
                <HStack p={2} borderRadius="md" cursor="pointer" _hover={{ bg: 'bg.subtle' }} onClick={onToggleMute}>
                  {chat.isMuted ? <LuBellOff size={16} /> : <LuBell size={16} />}
                  <Text fontSize="sm" flex={1}>
                    Уведомления
                  </Text>
                  <Switch.Root checked={!chat.isMuted} size="sm" onCheckedChange={onToggleMute}>
                    <Switch.HiddenInput />
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Root>
                </HStack>

                {/* Участники (для групповых чатов) */}
                {chat.type !== 'PRIVATE' && (
                  <HStack
                    p={2}
                    borderRadius="md"
                    cursor="pointer"
                    _hover={{ bg: 'bg.subtle' }}
                    onClick={() => setIsParticipantsOpen(true)}
                  >
                    <LuUsers size={16} />
                    <Text fontSize="sm">Участники ({chat.participants.length})</Text>
                  </HStack>
                )}
              </VStack>
            </Popover.Content>
          </Popover.Positioner>
        </Portal>
      </Popover.Root>
      <ChatParticipantsModal
        isOpen={isParticipantsOpen}
        onClose={() => setIsParticipantsOpen(false)}
        participants={chat.participants}
        currentUserId={currentUserId}
      />
    </HStack>
  )
}
