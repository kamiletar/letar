'use client'

import { Avatar, Box, HStack, Text, VStack } from '@chakra-ui/react'

interface Message {
  id: string
  content: string
  isFromSupport: boolean
  author: {
    id: string
    name: string
    image: string | null
  }
  createdAt: Date
}

interface TicketChatProps {
  messages: Message[]
  description: string
  authorName: string
  authorImage: string | null
  createdAt: Date
  currentUserId: string
}

export function TicketChat({
  messages,
  description,
  authorName,
  authorImage,
  createdAt,
  currentUserId,
}: TicketChatProps) {
  return (
    <VStack gap={4} align="stretch">
      {/* Исходное описание тикета */}
      <MessageBubble
        content={description}
        authorName={authorName}
        authorImage={authorImage}
        createdAt={createdAt}
        isOwn={false}
        isFromSupport={false}
        isFirstMessage
      />

      {/* Сообщения */}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          content={message.content}
          authorName={message.author.name}
          authorImage={message.author.image}
          createdAt={message.createdAt}
          isOwn={message.author.id === currentUserId}
          isFromSupport={message.isFromSupport}
        />
      ))}
    </VStack>
  )
}

interface MessageBubbleProps {
  content: string
  authorName: string
  authorImage: string | null
  createdAt: Date
  isOwn: boolean
  isFromSupport: boolean
  isFirstMessage?: boolean
}

function MessageBubble({
  content,
  authorName,
  authorImage,
  createdAt,
  isOwn,
  isFromSupport,
  isFirstMessage,
}: MessageBubbleProps) {
  return (
    <HStack gap={3} align="start" flexDirection={isOwn ? 'row-reverse' : 'row'}>
      <Avatar.Root size="sm">
        <Avatar.Fallback>{authorName.charAt(0).toUpperCase()}</Avatar.Fallback>
        {authorImage && <Avatar.Image src={authorImage} alt={authorName} />}
      </Avatar.Root>

      <Box maxW="80%">
        <HStack gap={2} mb={1} flexDirection={isOwn ? 'row-reverse' : 'row'}>
          <Text fontSize="sm" fontWeight="medium">
            {authorName}
            {isFromSupport && (
              <Text as="span" color="brand.solid" ml={1}>
                (поддержка)
              </Text>
            )}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            {new Date(createdAt).toLocaleString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </HStack>

        <Box
          bg={isFromSupport ? 'brand.subtle' : isOwn ? 'bg.emphasized' : 'bg.subtle'}
          p={3}
          borderRadius="lg"
          borderTopLeftRadius={!isOwn ? 'sm' : undefined}
          borderTopRightRadius={isOwn ? 'sm' : undefined}
        >
          <Text whiteSpace="pre-wrap">{content}</Text>
          {isFirstMessage && (
            <Text fontSize="xs" color="fg.muted" mt={2} fontStyle="italic">
              Исходное обращение
            </Text>
          )}
        </Box>
      </Box>
    </HStack>
  )
}
