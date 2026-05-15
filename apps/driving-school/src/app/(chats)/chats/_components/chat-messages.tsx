'use client'

import { Avatar, Box, HStack, Text, VStack } from '@chakra-ui/react'
import { memo, useEffect, useMemo, useRef } from 'react'
import type { ChatDetails, ChatMessage } from '../_services'
import { MessageActions } from './message-actions'

interface ChatMessagesProps {
  chat: ChatDetails
  currentUserId: string
  onReply?: (messageId: string) => void
  onEdit?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
  typingUsers?: Array<{ userId: string; userName: string }>
}

export function ChatMessages({
  chat,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReaction,
  typingUsers,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Прокрутка к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.messages.length])

  // Группировка сообщений по дате (мемоизация для оптимизации)
  const groupedMessages = useMemo(() => groupMessagesByDate(chat.messages), [chat.messages])

  return (
    <VStack gap={4} align="stretch" flex={1} overflowY="auto" p={4}>
      {Object.entries(groupedMessages).map(([date, messages]) => (
        <Box key={date}>
          {/* Разделитель даты */}
          <HStack justify="center" my={4}>
            <Box px={3} py={1} bg="bg.subtle" borderRadius="full" fontSize="xs" color="fg.muted">
              {formatDateSeparator(date)}
            </Box>
          </HStack>

          {/* Сообщения за эту дату */}
          <VStack gap={2} align="stretch">
            {messages.map((message, index) => {
              const prevMessage = messages[index - 1]
              const showAvatar = !prevMessage || prevMessage.authorId !== message.authorId
              const isOwn = message.authorId === currentUserId

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={isOwn}
                  showAvatar={showAvatar}
                  onReply={onReply}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReaction={onReaction}
                />
              )
            })}
          </VStack>
        </Box>
      ))}

      {/* Индикатор печати */}
      {typingUsers && typingUsers.length > 0 && (
        <HStack gap={2} px={2} py={1}>
          <Box
            w={8}
            h={8}
            borderRadius="full"
            bg="bg.subtle"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box as="span" animation="pulse 1.5s ease-in-out infinite" fontSize="xs">
              • • •
            </Box>
          </Box>
          <Text fontSize="sm" color="fg.muted">
            {typingUsers.length === 1
              ? `${typingUsers[0].userName} печатает...`
              : `${typingUsers.map((u) => u.userName).join(', ')} печатают...`}
          </Text>
        </HStack>
      )}

      <div ref={messagesEndRef} />
    </VStack>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
  isOwn: boolean
  showAvatar: boolean
  onReply?: (messageId: string) => void
  onEdit?: (message: ChatMessage) => void
  onDelete?: (messageId: string) => void
  onReaction?: (messageId: string, emoji: string) => void
}

// Мемоизированный компонент пузыря сообщения
const MessageBubble = memo(function MessageBubble({
  message,
  isOwn,
  showAvatar,
  onReply,
  onEdit,
  onDelete,
  onReaction,
}: MessageBubbleProps) {
  return (
    <HStack gap={2} align="end" flexDirection={isOwn ? 'row-reverse' : 'row'} className={'group'} role="group" w="full">
      {/* Аватар */}
      <Box w={8} flexShrink={0}>
        {showAvatar && !isOwn && (
          <Avatar.Root size="sm">
            <Avatar.Fallback>{message.author.name?.charAt(0).toUpperCase() || '?'}</Avatar.Fallback>
            {message.author.image && <Avatar.Image src={message.author.image} alt={message.author.name || 'User'} />}
          </Avatar.Root>
        )}
      </Box>
      {/* Контент сообщения */}
      <Box maxW="70%" position="relative">
        {/* Имя автора - показываем только для первой группы сообщений */}
        {!isOwn && showAvatar && (
          <Text fontSize="xs" color="fg.muted" mb={1} ml={2}>
            {message.author.name || 'Пользователь'}
          </Text>
        )}

        {/* Цитируемое сообщение */}
        {message.replyTo && (
          <Box
            bg="bg.subtle"
            borderLeftWidth={2}
            borderLeftColor="fg.muted"
            px={2}
            py={1}
            mb={1}
            borderRadius="md"
            fontSize="sm"
          >
            <Text fontWeight="medium" fontSize="xs" color="fg.muted">
              {message.replyTo.authorName}
            </Text>
            <Text truncate color="fg.muted">
              {message.replyTo.content}
            </Text>
          </Box>
        )}

        {/* Пузырь сообщения */}
        <Box
          bg={isOwn ? 'brand.solid' : 'bg.subtle'}
          color={isOwn ? 'brand.contrast' : 'fg'}
          px={3}
          py={2}
          borderRadius="lg"
          borderTopRightRadius={isOwn ? 'sm' : 'lg'}
          borderTopLeftRadius={isOwn ? 'lg' : 'sm'}
        >
          <Text whiteSpace="pre-wrap" wordBreak="break-word">
            {message.content}
          </Text>

          <HStack justify="flex-end" gap={1} mt={1}>
            {message.editedAt && (
              <Text fontSize="xs" color="currentColor" opacity={0.7}>
                изм.
              </Text>
            )}
            <Text fontSize="xs" color="currentColor" opacity={0.7}>
              {new Date(message.createdAt).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </HStack>
        </Box>

        {/* Реакции */}
        {message.reactions.length > 0 && (
          <HStack gap={1} mt={1} flexWrap="wrap">
            {message.reactions.map((reaction) => (
              <Box
                key={reaction.emoji}
                as="button"
                bg={reaction.hasReacted ? 'colorPalette.subtle' : 'bg.subtle'}
                colorPalette={reaction.hasReacted ? 'fg' : undefined}
                px={2}
                py={0.5}
                borderRadius="full"
                fontSize="sm"
                cursor="pointer"
                onClick={() => onReaction?.(message.id, reaction.emoji)}
                _hover={{ bg: 'bg.emphasized' }}
              >
                {reaction.emoji} {reaction.count}
              </Box>
            ))}
          </HStack>
        )}
      </Box>
      {/* Действия (в потоке, не абсолютные) */}
      <MessageActions
        message={message}
        isOwn={isOwn}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onReaction={onReaction}
      />
    </HStack>
  )
})

// Группировка сообщений по дате
function groupMessagesByDate(messages: ChatMessage[]): Record<string, ChatMessage[]> {
  const groups: Record<string, ChatMessage[]> = {}

  for (const message of messages) {
    const date = new Date(message.createdAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
  }

  return groups
}

// Форматирование разделителя даты
function formatDateSeparator(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return 'Сегодня'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Вчера'
  } else {
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    })
  }
}
