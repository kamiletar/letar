import { Box, Text } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface QuoteProps {
  /** Источник цитаты (например: "Преамбула Конституции") */
  author?: string
  /** Текст цитаты */
  children: ReactNode
}

/**
 * Эпиграф или цитата из документа.
 * Курсив с красной вертикальной чертой слева.
 * Server Component — нет хуков.
 */
export function Quote({ author, children }: QuoteProps) {
  return (
    <Box as="blockquote" my={6} pl={4} borderLeftWidth="3px" borderLeftColor="brand.500" fontStyle="italic">
      <Text color="fg.default" fontSize="md" lineHeight="tall">
        {children}
      </Text>
      {author && (
        <Text mt={2} fontSize="sm" color="fg.muted" textAlign="right">
          — {author}
        </Text>
      )}
    </Box>
  )
}
