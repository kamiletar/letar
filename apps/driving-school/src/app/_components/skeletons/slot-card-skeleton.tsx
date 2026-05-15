'use client'

import { Card, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton компонент для карточки слота расписания
 *
 * Повторяет структуру SlotCard
 */
export function SlotCardSkeleton() {
  return (
    <Card.Root size="sm">
      <Card.Body>
        <HStack justify="space-between">
          <VStack align="start" gap={1}>
            {/* Дата */}
            <HStack gap={2}>
              <Skeleton height="4" width="4" borderRadius="md" />
              <Skeleton height="4" width="24" />
            </HStack>
            {/* Время */}
            <HStack gap={2}>
              <Skeleton height="4" width="4" borderRadius="md" />
              <Skeleton height="4" width="28" />
            </HStack>
          </VStack>

          {/* Кнопка */}
          <Skeleton height="10" width="28" borderRadius="md" />
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
