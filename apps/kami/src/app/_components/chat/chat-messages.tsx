'use client'

import type { UIMessage } from '@ai-sdk/react'
import { Box, Card, Icon, Text, VStack } from '@chakra-ui/react'
import { Bot } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

interface ChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  error: Error | undefined
}

/**
 * Извлекает текст из частей сообщения
 */
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
  return parts
    .filter((part) => part.type === 'text' && part.text)
    .map((part) => part.text)
    .join('')
}

/**
 * Список сообщений чата
 */
export function ChatMessages({ messages, isLoading, error }: ChatMessagesProps) {
  const t = useTranslations('chat')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Автоскролл к последнему сообщению
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <Card.Body flex={1} overflowY="auto" p={4} bg="bg.subtle" minH="300px" maxH="350px">
      <VStack gap={3} align="stretch">
        {messages.length === 0 && (
          <Box textAlign="center" py={8}>
            <Icon boxSize={10} color="fg" mb={3}>
              <Bot />
            </Icon>
            <Text color="fg.muted" fontSize="sm">
              {t('welcome')}
            </Text>
          </Box>
        )}

        {messages.map((message) => {
          const text = getMessageText(message.parts as Array<{ type: string; text?: string }>)
          if (!text) {
            return null
          }

          return (
            <Box key={message.id} alignSelf={message.role === 'user' ? 'flex-end' : 'flex-start'} maxW="85%">
              <Box
                bg={message.role === 'user' ? 'fg.solid' : 'bg.panel'}
                color={message.role === 'user' ? 'fg.contrast' : 'inherit'}
                px={3}
                py={2}
                borderRadius="lg"
                fontSize="sm"
                shadow="sm"
                borderWidth={message.role === 'assistant' ? '1px' : undefined}
                borderColor="border"
              >
                <Text whiteSpace="pre-wrap">{text}</Text>
              </Box>
            </Box>
          )
        })}

        {isLoading && (
          <Box alignSelf="flex-start" maxW="85%">
            <Box
              bg="bg.panel"
              px={3}
              py={2}
              borderRadius="lg"
              fontSize="sm"
              shadow="sm"
              borderWidth="1px"
              borderColor="border"
            >
              <Text color="fg.muted">{t('thinking')}</Text>
            </Box>
          </Box>
        )}

        {error && (
          <Text color="red.500" fontSize="sm" textAlign="center">
            {t('error')}
          </Text>
        )}

        <div ref={messagesEndRef} />
      </VStack>
    </Card.Body>
  )
}
