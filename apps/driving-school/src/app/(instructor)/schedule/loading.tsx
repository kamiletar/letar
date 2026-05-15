'use client'

import { Box, Container, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton загрузки для страницы расписания инструктора
 *
 * Отображается при переходе на страницу расписания
 */
export default function ScheduleLoading() {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch" role="status" aria-label="Загрузка расписания" aria-busy="true">
        {/* Header skeleton */}
        <HStack justify="space-between" gap={4}>
          <Skeleton height="8" width="40" />
          <Skeleton height="8" width="24" borderRadius="md" />
        </HStack>

        {/* Заголовок */}
        <Box>
          <Skeleton height="10" width="48" />
          <Skeleton height="5" width="64" mt={2} />
        </Box>

        {/* Кнопка настроек */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box />
          <Skeleton height="10" width="48" borderRadius="md" />
        </HStack>

        {/* Горизонтальный date picker skeleton */}
        <HStack gap={2} overflowX="hidden" py={2}>
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={`date-${i}`} height="16" width="16" flexShrink={0} borderRadius="lg" />
          ))}
        </HStack>

        {/* Слоты skeleton */}
        <VStack gap={3} align="stretch">
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={`slot-${i}`} p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel">
              <HStack justify="space-between">
                <HStack gap={3}>
                  <Skeleton height="6" width="16" />
                  <Skeleton height="4" width="8" />
                  <Skeleton height="6" width="16" />
                </HStack>
                <Skeleton height="8" width="24" borderRadius="md" />
              </HStack>
            </Box>
          ))}
        </VStack>
      </VStack>
    </Container>
  )
}
