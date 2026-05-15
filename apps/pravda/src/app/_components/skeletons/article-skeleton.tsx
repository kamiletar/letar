import { Box, Flex, Skeleton, SkeletonText, VStack } from '@chakra-ui/react'

/**
 * Skeleton для статьи закона.
 * Имитирует структуру Article компонента во время загрузки.
 */
export function ArticleSkeleton() {
  return (
    <Box
      pl={5}
      pr={2}
      py={3}
      mb={4}
      borderLeftWidth="3px"
      borderLeftColor="gray.200"
      borderRadius="0 md md 0"
      _dark={{ borderLeftColor: 'gray.700' }}
    >
      <Flex align="flex-start" gap={3}>
        {/* Badge skeleton */}
        <Skeleton borderRadius="md" w="50px" h="20px" />

        {/* Текст skeleton */}
        <Box flex="1">
          <SkeletonText noOfLines={2} gap={2} />
        </Box>
      </Flex>
    </Box>
  )
}

/**
 * Skeleton для раздела документа.
 * Включает заголовок и несколько статей.
 */
export function SectionSkeleton() {
  return (
    <Box mb={8}>
      {/* Заголовок раздела */}
      <Box mb={4} pb={3} borderBottomWidth="2px" borderBottomColor="gray.200" _dark={{ borderBottomColor: 'gray.700' }}>
        <Skeleton h="28px" w="60%" />
      </Box>

      {/* Статьи */}
      <VStack align="stretch" gap={0}>
        <ArticleSkeleton />
        <ArticleSkeleton />
        <ArticleSkeleton />
      </VStack>
    </Box>
  )
}

/**
 * Полный skeleton для страницы документа.
 * Включает заголовок и несколько разделов.
 */
export function DocumentSkeleton() {
  return (
    <VStack align="stretch" gap={6}>
      {/* Заголовок документа */}
      <Box mb={4}>
        <Skeleton h="36px" w="70%" mb={2} />
        <Skeleton h="20px" w="40%" />
      </Box>

      {/* Разделы */}
      <SectionSkeleton />
      <SectionSkeleton />
    </VStack>
  )
}
