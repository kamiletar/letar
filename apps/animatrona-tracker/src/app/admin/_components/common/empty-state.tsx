'use client'

import { Box, Heading, Icon, Text } from '@chakra-ui/react'

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
      <Icon as={IconComponent} boxSize={12} color="green.500" mb={4} />
      <Heading size="lg">{title}</Heading>
      <Text color="fg.muted">{subtitle}</Text>
    </Box>
  )
}
