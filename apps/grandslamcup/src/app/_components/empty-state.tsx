/**
 * Пустое состояние — используется когда нет данных для отображения.
 */

import { Box, type BoxProps } from '@chakra-ui/react'

interface EmptyStateProps extends BoxProps {
  children: React.ReactNode
}

export function EmptyState({ children, ...props }: EmptyStateProps) {
  return (
    <Box bg="bg.panel" borderRadius="xl" p={8} textAlign="center" borderWidth="1px" borderColor="border" {...props}>
      {children}
    </Box>
  )
}
