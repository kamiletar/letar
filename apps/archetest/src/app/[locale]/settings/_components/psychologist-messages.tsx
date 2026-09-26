'use client'

import { Badge, Card, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { LuMessageSquare } from 'react-icons/lu'
import { type ClientMessage, getMyMessagesAction, markMyMessagesReadAction } from '../../_actions/messages.action'

/**
 * «Сообщения от психолога» в настройках клиента (волна 7.5). Непрочитанные на момент загрузки
 * помечены «новое» до конца визита; на сервере они отмечаются прочитанными сразу после показа.
 * Нет ни одного сообщения — раздел не рендерится.
 */
export function PsychologistMessages() {
  const t = useTranslations('settings.messages')
  const locale = useLocale()
  const [messages, setMessages] = useState<ClientMessage[]>([])

  useEffect(() => {
    let cancelled = false
    getMyMessagesAction().then((result) => {
      if (cancelled) {
        return
      }
      setMessages(result.data)
      if (result.data.some((m) => !m.readAt)) {
        void markMyMessagesReadAction()
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (messages.length === 0) {
    return null
  }

  const unreadCount = messages.filter((m) => !m.readAt).length

  return (
    <Card.Root w="100%" variant="outline" data-testid="psychologist-messages">
      <Card.Body>
        <VStack align="start" gap={4}>
          <HStack gap={2} wrap="wrap">
            <LuMessageSquare size={20} />
            <Heading size="md">{t('title')}</Heading>
            {unreadCount > 0 && (
              <Badge colorPalette="purple" variant="solid" size="sm">
                {t('unread', { count: unreadCount })}
              </Badge>
            )}
          </HStack>

          {messages.map((message) => (
            <Card.Root key={message.id} w="100%" variant="subtle">
              <Card.Body py={3}>
                <VStack align="start" gap={1}>
                  <HStack gap={2} wrap="wrap">
                    <Text fontSize="sm" fontWeight="bold">
                      {message.psychologistName}
                    </Text>
                    {!message.readAt && (
                      <Badge colorPalette="purple" size="sm">
                        {t('new')}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="sm" whiteSpace="pre-line" overflowWrap="anywhere">
                    {message.body}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {new Date(message.createdAt).toLocaleString(locale)}
                  </Text>
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
