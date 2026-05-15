'use client'

/**
 * Спойлер для прошедших матчей на странице расписания.
 */

import { Box, Collapsible, Heading, VStack } from '@chakra-ui/react'
import type { ReactNode } from 'react'

interface FinishedMatchesCollapsibleProps {
  count: number
  children: ReactNode
}

export function FinishedMatchesCollapsible({ count, children }: FinishedMatchesCollapsibleProps) {
  return (
    <Collapsible.Root>
      <Collapsible.Trigger asChild>
        <Box
          cursor="pointer"
          py={3}
          px={4}
          bg="bg.subtle"
          borderRadius="lg"
          _hover={{ bg: 'bg.muted' }}
          transition="backgrounds"
        >
          <Heading size="md" color="fg.muted">
            Прошедшие матчи ({count}) ▾
          </Heading>
        </Box>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <VStack gap={2} align="stretch" mt={2}>
          {children}
        </VStack>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
