'use client'

import { Box, HStack, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/**
 * Skeleton для карточки блога
 */
export function BlogCardSkeleton() {
  return (
    <Box
      p={6}
      borderRadius="xl"
      bg={{ base: 'white', _dark: 'gray.900' }}
      border="1px solid"
      borderColor="border.subtle"
    >
      <VStack align="start" gap={3}>
        {/* Заголовок */}
        <Skeleton height="24px" width="80%" />

        {/* Описание */}
        <SkeletonText noOfLines={3} gap="2" width="100%" />

        {/* Теги */}
        <HStack gap={2}>
          <Skeleton height="20px" width="60px" borderRadius="md" />
          <Skeleton height="20px" width="50px" borderRadius="md" />
          <Skeleton height="20px" width="70px" borderRadius="md" />
        </HStack>

        {/* Дата */}
        <Skeleton height="16px" width="120px" />
      </VStack>
    </Box>
  )
}

/**
 * Skeleton для списка блога
 */
export function BlogListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => <BlogCardSkeleton key={`skeleton-${i}`} />)}
    </>
  )
}
