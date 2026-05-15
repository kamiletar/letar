'use client'

/**
 * Skeleton для загрузки панели
 */

import { Box, Skeleton, SkeletonCircle, VStack } from '@chakra-ui/react'

interface PanelSkeletonProps {
  /** Тип скелетона: profile, lessons, students, schedule */
  variant?: 'profile' | 'lessons' | 'students' | 'schedule'
}

export function PanelSkeleton({ variant = 'profile' }: PanelSkeletonProps) {
  if (variant === 'profile') {
    return (
      <VStack gap={4} p={4} align="stretch">
        {/* Аватар и имя */}
        <VStack gap={3} align="center">
          <SkeletonCircle size="80px" />
          <Skeleton height="24px" width="150px" />
          <Skeleton height="16px" width="100px" />
        </VStack>

        {/* Статистика */}
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={3}>
          <Skeleton height="60px" borderRadius="md" />
          <Skeleton height="60px" borderRadius="md" />
          <Skeleton height="60px" borderRadius="md" />
          <Skeleton height="60px" borderRadius="md" />
        </Box>

        {/* Список */}
        <VStack gap={2} align="stretch">
          <Skeleton height="40px" />
          <Skeleton height="40px" />
          <Skeleton height="40px" />
        </VStack>
      </VStack>
    )
  }

  if (variant === 'lessons' || variant === 'schedule') {
    return (
      <VStack gap={3} p={4} align="stretch">
        {/* Заголовок */}
        <Skeleton height="28px" width="180px" />

        {/* Карточки уроков */}
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={`lesson-skeleton-${i}`} borderWidth="1px" borderRadius="md" p={3}>
            <VStack gap={2} align="stretch">
              <Skeleton height="16px" width="120px" />
              <Skeleton height="14px" width="180px" />
              <Skeleton height="14px" width="100px" />
            </VStack>
          </Box>
        ))}
      </VStack>
    )
  }

  if (variant === 'students') {
    return (
      <VStack gap={3} p={4} align="stretch">
        {/* Заголовок */}
        <Skeleton height="28px" width="140px" />

        {/* Список студентов */}
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={`student-skeleton-${i}`} display="flex" alignItems="center" gap={3}>
            <SkeletonCircle size="40px" />
            <VStack gap={1} align="start" flex={1}>
              <Skeleton height="16px" width="120px" />
              <Skeleton height="12px" width="80px" />
            </VStack>
          </Box>
        ))}
      </VStack>
    )
  }

  // Fallback
  return (
    <VStack gap={3} p={4} align="stretch">
      <Skeleton height="200px" />
    </VStack>
  )
}
