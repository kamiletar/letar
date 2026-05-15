'use client'

import { Box, Card, Container, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton загрузки для страницы расписания ученика
 *
 * Отображается при переходе на страницу записи на занятие
 */
export default function StudentScheduleLoading() {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch" role="status" aria-label="Загрузка расписания" aria-busy="true">
        {/* Заголовок */}
        <Box>
          <Skeleton height="10" width="48" />
          <Skeleton height="5" width="72" mt={2} />
        </Box>

        {/* Карточки инструкторов со слотами skeleton */}
        {Array.from({ length: 2 }).map((_, i) => (
          <Card.Root key={`instructor-${i}`}>
            <Card.Body>
              <VStack align="stretch" gap={4}>
                {/* Инструктор header */}
                <HStack gap={4}>
                  <Skeleton height="12" width="12" borderRadius="full" />
                  <Box flex={1}>
                    <Skeleton height="6" width="40" />
                    <Skeleton height="4" width="56" mt={1} />
                  </Box>
                </HStack>

                {/* Date picker skeleton */}
                <HStack gap={2} overflowX="hidden">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Skeleton key={`date-${i}-${j}`} height="14" width="14" flexShrink={0} borderRadius="lg" />
                  ))}
                </HStack>

                {/* Слоты skeleton */}
                <HStack gap={2} flexWrap="wrap">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={`slot-${i}-${j}`} height="10" width="20" borderRadius="md" />
                  ))}
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        ))}
      </VStack>
    </Container>
  )
}
