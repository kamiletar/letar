'use client'

import { Box, Card, Container, HStack, SimpleGrid, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton загрузки для личного кабинета
 *
 * Отображается при переходе на /dashboard
 */
export default function DashboardLoading() {
  return (
    <Container maxW="container.xl" py={8}>
      <VStack gap={8} align="stretch" role="status" aria-label="Загрузка личного кабинета" aria-busy="true">
        {/* Навигация */}
        <HStack justify="space-between">
          <Skeleton height="9" width="32" borderRadius="md" />
          <Skeleton height="9" width="24" borderRadius="md" />
        </HStack>

        {/* Приветствие */}
        <Box>
          <HStack gap={4} flexWrap="wrap" align="center">
            <Skeleton height="10" width="72" />
            <HStack gap={2}>
              <Skeleton height="6" width="24" borderRadius="md" />
              <Skeleton height="6" width="20" borderRadius="md" />
            </HStack>
          </HStack>
          <Skeleton height="5" width="56" mt={2} />
        </Box>

        {/* Секция ролевых карточек */}
        <Box>
          <Skeleton height="8" width="40" mb={4} />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {Array.from({ length: 6 }).map((_, i) => (
              <DashboardCardSkeleton key={`card-${i}`} />
            ))}
          </SimpleGrid>
        </Box>

        {/* Секция "Общее" */}
        <Box>
          <Skeleton height="8" width="24" mb={4} />
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
            {Array.from({ length: 2 }).map((_, i) => (
              <DashboardCardSkeleton key={`common-${i}`} />
            ))}
          </SimpleGrid>
        </Box>
      </VStack>
    </Container>
  )
}

/**
 * Skeleton для карточки личного кабинета
 */
function DashboardCardSkeleton() {
  return (
    <Card.Root>
      <Card.Body>
        <HStack gap={4}>
          <Skeleton height="10" width="10" borderRadius="md" />
          <Box flex={1}>
            <Skeleton height="6" width="32" />
            <Skeleton height="4" width="48" mt={1} />
          </Box>
        </HStack>
      </Card.Body>
    </Card.Root>
  )
}
