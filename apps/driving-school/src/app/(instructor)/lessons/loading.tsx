'use client'

import { LessonCardSkeleton } from '@/app/_components/skeletons'
import { Box, Container, SimpleGrid, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton загрузки для страницы занятий инструктора
 *
 * Отображается при переходе на страницу занятий.
 * Примечание: компонент LessonsListInfinite имеет свой внутренний loading state.
 */
export default function LessonsLoading() {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch" role="status" aria-label="Загрузка занятий" aria-busy="true">
        {/* Заголовок */}
        <Box>
          <Skeleton height="10" width="48" />
          <Skeleton height="5" width="64" mt={2} />
        </Box>

        {/* Фильтр skeleton */}
        <Box p={4} borderWidth="1px" borderRadius="lg" bg="bg.panel">
          <Box display="flex" gap={2} flexWrap="wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={`filter-${i}`} height="9" width="24" borderRadius="full" />
            ))}
          </Box>
        </Box>

        {/* Секция занятий */}
        <Box>
          <Skeleton height="7" width="56" mb={4} />
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <LessonCardSkeleton key={`lesson-${i}`} />
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  )
}
