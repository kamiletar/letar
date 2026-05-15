'use client'

import { Card, HStack, Skeleton, Stack, VStack } from '@chakra-ui/react'

/**
 * Skeleton компонент для карточки занятия
 *
 * Повторяет структуру LessonCard и StudentLessonCard
 */
export function LessonCardSkeleton() {
  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Шапка с датой и статусом */}
          <HStack justify="space-between">
            <HStack gap={2}>
              <Skeleton height="5" width="5" borderRadius="md" />
              <Skeleton height="5" width="24" />
            </HStack>
            <Skeleton height="6" width="28" borderRadius="md" />
          </HStack>

          {/* Время */}
          <HStack gap={2}>
            <Skeleton height="5" width="5" borderRadius="md" />
            <Skeleton height="5" width="32" />
          </HStack>

          {/* Ученик/Инструктор */}
          <HStack gap={2}>
            <Skeleton height="5" width="5" borderRadius="md" />
            <Skeleton height="5" width="40" />
          </HStack>

          {/* Кнопки действий */}
          <Stack direction={{ base: 'column', sm: 'row' }} gap={2}>
            <Skeleton height="10" width="32" borderRadius="md" />
            <Skeleton height="10" width="28" borderRadius="md" />
          </Stack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
