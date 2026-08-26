'use client'

import { Box, Heading, Text } from '@chakra-ui/react'

interface EmptyStateProps {
  /** Иконка из react-icons */
  icon: React.ElementType
  /** Заголовок */
  title: string
  /** Подзаголовок */
  subtitle: string
}

/** Пустое состояние для вкладок */
export function EmptyState({ icon: IconComponent, title, subtitle }: EmptyStateProps) {
  return (
    <Box textAlign="center" py={16} bg="bg.panel" borderRadius="xl">
      <IconComponent
        size={48}
        color="var(--chakra-colors-green-500)"
        style={{ marginBottom: '16px' }}
      />
      <Heading size="lg">{title}</Heading>
      <Text color="fg.muted">{subtitle}</Text>
    </Box>
  )
}
