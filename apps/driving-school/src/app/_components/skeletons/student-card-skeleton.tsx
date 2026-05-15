'use client'

import { Box, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton компонент для карточки ученика
 *
 * Повторяет структуру StudentCard
 */
export function StudentCardSkeleton() {
  return (
    <Box bg="bg.panel" p={4} borderRadius="lg" shadow="sm" borderWidth="1px">
      <VStack gap={3} align="stretch">
        {/* Аватар и информация */}
        <HStack gap={3}>
          <Skeleton height="10" width="10" borderRadius="full" />
          <Box flex={1}>
            <Skeleton height="5" width="32" mb={1} />
            <Skeleton height="4" width="48" />
          </Box>
          <Skeleton height="5" width="20" borderRadius="md" />
        </HStack>

        {/* Бейджи лицензий */}
        <HStack gap={2} flexWrap="wrap">
          <Skeleton height="5" width="5" borderRadius="md" />
          <Skeleton height="5" width="12" borderRadius="md" />
          <Skeleton height="5" width="12" borderRadius="md" />
        </HStack>

        {/* Действия */}
        <HStack gap={3}>
          <Skeleton height="8" width="8" borderRadius="md" />
        </HStack>

        {/* Статистика и баланс */}
        <HStack justify="space-between" pt={2} borderTopWidth="1px">
          <HStack gap={4}>
            <Box>
              <Skeleton height="3" width="12" mb={1} />
              <Skeleton height="5" width="16" />
            </Box>
            <Box>
              <Skeleton height="3" width="16" mb={1} />
              <Skeleton height="5" width="8" />
            </Box>
          </HStack>
          <Skeleton height="8" width="20" borderRadius="md" />
        </HStack>
      </VStack>
    </Box>
  )
}
