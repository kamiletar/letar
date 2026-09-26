'use client'

import { Badge, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { MessageComposer } from '../../_components/message-composer'

interface SentMessage {
  id: string
  body: string
  createdAt: Date
  readAt: Date | null
}

interface ClientMessagesProps {
  linkId: string
  messages: SentMessage[]
  onSent: () => void
}

/** Сообщения клиенту в карточке: форма и отправленные с отметкой «прочитано» (волна 7.5) */
export function ClientMessages({ linkId, messages, onSent }: ClientMessagesProps) {
  const t = useTranslations('cabinet.messages')
  const locale = useLocale()

  return (
    <VStack align="start" gap={3} w="100%">
      <Heading size="md">{t('title')}</Heading>
      <Text fontSize="sm" color="fg.muted">
        {t('hint')}
      </Text>

      <MessageComposer linkId={linkId} onSent={onSent} />

      {messages.map((message) => (
        <Card.Root key={message.id} w="100%" variant="subtle">
          <Card.Body py={3}>
            <VStack align="start" gap={1}>
              <Text fontSize="sm" whiteSpace="pre-line" overflowWrap="anywhere">
                {message.body}
              </Text>
              <HStack gap={2} wrap="wrap">
                <Text fontSize="xs" color="fg.muted">
                  {new Date(message.createdAt).toLocaleString(locale)}
                </Text>
                <Badge size="sm" colorPalette={message.readAt ? 'green' : 'gray'}>
                  {message.readAt ? t('read') : t('unread')}
                </Badge>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </VStack>
  )
}
