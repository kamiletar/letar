'use client'

import { StudentCardSkeleton } from '@/app/_components/skeletons'
import { Box, Container, HStack, SimpleGrid, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton загрузки для страницы списка учеников
 *
 * Отображается при переходе на страницу учеников инструктора
 */
export default function StudentsLoading() {
  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch" role="status" aria-label="Загрузка списка учеников" aria-busy="true">
        {/* Header skeleton */}
        <HStack justify="space-between" gap={4}>
          <Skeleton height="8" width="40" />
          <Skeleton height="8" width="24" borderRadius="md" />
        </HStack>

        {/* Заголовок */}
        <HStack justify="space-between" wrap="wrap" gap={4}>
          <Box>
            <Skeleton height="10" width="48" />
            <Skeleton height="5" width="40" mt={2} />
          </Box>
          <Skeleton height="10" width="48" borderRadius="md" />
        </HStack>

        {/* Секция "Активные" */}
        <Box>
          <Skeleton height="7" width="36" mb={4} />
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <StudentCardSkeleton key={`student-${i}`} />
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  )
}
