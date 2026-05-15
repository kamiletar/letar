'use client'

import { Box, Icon, IconButton } from '@chakra-ui/react'
import { MessageSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ChatButtonProps {
  onClick: () => void
}

/**
 * Кнопка открытия чата
 */
export function ChatButton({ onClick }: ChatButtonProps) {
  const t = useTranslations('chat')

  return (
    <Box position="fixed" bottom={6} right={6} zIndex="popover">
      <IconButton
        aria-label={t('openChat')}
        onClick={onClick}
        colorPalette="purple"
        size="lg"
        borderRadius="full"
        shadow="lg"
        _hover={{ transform: 'scale(1.05)' }}
        transition="all 0.2s"
      >
        <Icon boxSize={6}>
          <MessageSquare />
        </Icon>
      </IconButton>
    </Box>
  )
}
