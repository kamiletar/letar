'use client'

import { Box, HStack, Skeleton, VStack } from '@chakra-ui/react'

/**
 * Skeleton загрузки для страницы чата
 *
 * Отображается при переходе в конкретный чат
 */
export default function ChatLoading() {
  return (
    <VStack height="100%" gap={0} align="stretch" role="status" aria-label="Загрузка чата" aria-busy="true">
      {/* Header чата skeleton */}
      <Box p={4} borderBottomWidth="1px" bg="bg.panel">
        <HStack gap={3}>
          <Skeleton height="10" width="10" borderRadius="full" />
          <Box flex={1}>
            <Skeleton height="5" width="40" />
            <Skeleton height="4" width="24" mt={1} />
          </Box>
          <Skeleton height="9" width="9" borderRadius="md" />
        </HStack>
      </Box>

      {/* Сообщения skeleton */}
      <VStack flex={1} gap={4} p={4} overflowY="hidden" align="stretch">
        {/* Входящее сообщение */}
        <HStack align="end" gap={2}>
          <Skeleton height="8" width="8" borderRadius="full" />
          <Box maxW="70%">
            <Skeleton height="20" width="64" borderRadius="lg" />
          </Box>
        </HStack>

        {/* Исходящее сообщение */}
        <HStack align="end" gap={2} justify="end">
          <Box maxW="70%">
            <Skeleton height="14" width="48" borderRadius="lg" />
          </Box>
        </HStack>

        {/* Входящее сообщение */}
        <HStack align="end" gap={2}>
          <Skeleton height="8" width="8" borderRadius="full" />
          <Box maxW="70%">
            <Skeleton height="12" width="56" borderRadius="lg" />
          </Box>
        </HStack>

        {/* Исходящее сообщение */}
        <HStack align="end" gap={2} justify="end">
          <Box maxW="70%">
            <Skeleton height="24" width="72" borderRadius="lg" />
          </Box>
        </HStack>
      </VStack>

      {/* Форма отправки skeleton */}
      <Box p={4} borderTopWidth="1px" bg="bg.panel">
        <HStack gap={2}>
          <Skeleton height="10" flex={1} borderRadius="md" />
          <Skeleton height="10" width="10" borderRadius="md" />
        </HStack>
      </Box>
    </VStack>
  )
}
