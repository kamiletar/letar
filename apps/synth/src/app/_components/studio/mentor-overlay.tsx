'use client'

import { Box, Text } from '@chakra-ui/react'
import type { MentorHighlight } from './use-mentor-events'

interface MentorOverlayProps {
  highlight: MentorHighlight | null
  onDismiss: () => void
}

/** Всплывающая подсказка ментора (MCP-инструмент highlight_param) — золотая карточка внизу экрана */
export function MentorOverlay({ highlight, onDismiss }: MentorOverlayProps) {
  if (!highlight) {
    return null
  }

  return (
    <Box
      position="fixed"
      bottom={6}
      left="50%"
      transform="translateX(-50%)"
      zIndex={20}
      bg="bg.overlay"
      border="1px solid"
      borderColor="accent.DEFAULT"
      borderRadius="lg"
      px={5}
      py={3}
      maxW="420px"
      boxShadow="0 0 24px rgba(212,175,55,0.35)"
      asChild
    >
      <button onClick={onDismiss} style={{ textAlign: 'left', cursor: 'pointer' }}>
        <Text fontSize="10px" color="accent.DEFAULT" letterSpacing="0.12em" textTransform="uppercase" mb={1}>
          ✦ {highlight.name}
        </Text>
        <Text fontSize="xs" color="fg.DEFAULT" lineHeight="1.5">
          {highlight.message}
        </Text>
      </button>
    </Box>
  )
}
