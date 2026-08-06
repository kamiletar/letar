/**
 * ChatPanel — Панель чата Watch Party
 *
 * Показывает сообщения и позволяет отправлять текст и реакции.
 */

'use client'

import { Box, Button, Heading, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { type FormEvent, useRef, useState } from 'react'
import { LuSend } from 'react-icons/lu'

import type { WatchPartyChatMessage } from '../../../../../shared/types/orbitdb'
import { type Reaction, REACTIONS } from '../../../hooks/usePartyChat'

export interface ChatPanelProps {
  /** Сообщения чата */
  messages: WatchPartyChatMessage[]
  /** Отправить сообщение */
  onSendMessage: (text: string) => Promise<boolean>
  /** Отправить реакцию */
  onSendReaction: (reaction: Reaction) => Promise<boolean>
  /** Ref для автоскролла */
  messagesEndRef?: React.RefObject<HTMLDivElement | null>
  /** Текущий PeerId (для выделения своих сообщений) */
  currentPeerId?: string
}

export function ChatPanel({ messages, onSendMessage, onSendReaction, messagesEndRef, currentPeerId }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Обработка отправки
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    const text = inputValue.trim()
    if (!text || isSending) {
      return
    }

    setIsSending(true)
    const success = await onSendMessage(text)
    setIsSending(false)

    if (success) {
      setInputValue('')
      inputRef.current?.focus()
    }
  }

  // Обработка реакции
  const handleReaction = async (reaction: Reaction) => {
    if (isSending) {
      return
    }

    setIsSending(true)
    await onSendReaction(reaction)
    setIsSending(false)
  }

  return (
    <VStack align="stretch" gap={0} h="full">
      {/* Заголовок */}
      <Box px={4} py={3} borderBottomWidth={1} borderColor="border.subtle">
        <Heading size="sm">Чат</Heading>
      </Box>

      {/* Сообщения */}
      <VStack align="stretch" gap={2} flex={1} overflow="auto" px={4} py={2}>
        {messages.length === 0
          ? (
            <Text color="fg.muted" fontSize="sm" textAlign="center" py={4}>
              Нет сообщений. Напишите что-нибудь!
            </Text>
          )
          : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} isOwn={message.senderId === currentPeerId} />
            ))
          )}
        <div ref={messagesEndRef} />
      </VStack>

      {/* Реакции */}
      <HStack px={4} py={2} gap={1} borderTopWidth={1} borderColor="border.subtle">
        {REACTIONS.map((reaction) => (
          <Button
            key={reaction}
            variant="ghost"
            size="sm"
            px={2}
            onClick={() => handleReaction(reaction)}
            disabled={isSending}
          >
            {reaction}
          </Button>
        ))}
      </HStack>

      {/* Форма ввода */}
      <Box as="form" onSubmit={handleSubmit} px={4} py={3} borderTopWidth={1} borderColor="border.subtle">
        <HStack gap={2}>
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Написать сообщение..."
            size="sm"
            disabled={isSending}
          />
          <Button
            type="submit"
            colorPalette="blue"
            size="sm"
            disabled={!inputValue.trim() || isSending}
            loading={isSending}
          >
            <LuSend />
          </Button>
        </HStack>
      </Box>
    </VStack>
  )
}

interface ChatMessageProps {
  message: WatchPartyChatMessage
  isOwn: boolean
}

function ChatMessage({ message, isOwn }: ChatMessageProps) {
  const isReaction = Boolean(message.reaction)

  // Форматирование времени
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Реакция — показываем большим emoji
  if (isReaction) {
    return (
      <HStack gap={2} justify={isOwn ? 'flex-end' : 'flex-start'}>
        <VStack gap={0} align={isOwn ? 'end' : 'start'}>
          <Text fontSize="xs" color="fg.muted">
            {message.senderName}
          </Text>
          <Text fontSize="2xl">{message.reaction}</Text>
        </VStack>
      </HStack>
    )
  }

  // Текстовое сообщение
  return (
    <HStack gap={2} justify={isOwn ? 'flex-end' : 'flex-start'}>
      <VStack
        gap={0}
        align={isOwn ? 'end' : 'start'}
        bg={isOwn ? 'blue.subtle' : 'bg.subtle'}
        px={3}
        py={2}
        borderRadius="lg"
        maxW="80%"
      >
        <HStack gap={2} fontSize="xs" color="fg.muted">
          <Text fontWeight="medium">{message.senderName}</Text>
          <Text>{formatTime(message.timestamp)}</Text>
        </HStack>
        <Text fontSize="sm">{message.text}</Text>
      </VStack>
    </HStack>
  )
}
