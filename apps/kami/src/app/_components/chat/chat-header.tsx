'use client'

import { Card, Heading, HStack, Icon, IconButton } from '@chakra-ui/react'
import { Bot, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatHeaderProps {
  onClose: () => void
}

/**
 * Заголовок окна чата
 */
export function ChatHeader({ onClose }: ChatHeaderProps) {
  const t = useTranslations('chat')

  return (
    <Card.Header bg="fg.solid" color="fg.contrast" py={3}>
      <HStack justify="space-between">
        <HStack gap={2}>
          <Icon boxSize={5}>
            <Bot />
          </Icon>
          <Heading size="sm">{t('title')}</Heading>
        </HStack>
        <IconButton
          aria-label={t('closeChat')}
          onClick={onClose}
          variant="ghost"
          size="sm"
          color="fg.contrast"
          _hover={{ bg: 'fg.emphasized' }}
        >
          <Icon boxSize={5}>
            <X />
          </Icon>
        </IconButton>
      </HStack>
    </Card.Header>
  )
}
