'use client'

/**
 * Шаг результатов пакетной публикации
 */

import { Badge, Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuRefreshCw, LuX } from 'react-icons/lu'

import type { BatchResult } from './use-batch-publish'

interface ResultStepProps {
  result: BatchResult
  onClose: () => void
  onRetry: () => void
}

export function ResultStep({ result, onClose, onRetry }: ResultStepProps) {
  const hasErrors = result.errorCount > 0
  const hasCancelled = result.cancelledCount > 0

  return (
    <VStack gap={4} align="stretch">
      {/* Сводка */}
      <HStack gap={4} justify="center" p={4} bg="bg.subtle" borderRadius="md">
        <VStack gap={0}>
          <Text fontSize="2xl" fontWeight="bold" color="green.fg">
            {result.successCount}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            Успешно
          </Text>
        </VStack>

        {hasErrors && (
          <VStack gap={0}>
            <Text fontSize="2xl" fontWeight="bold" color="red.fg">
              {result.errorCount}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Ошибок
            </Text>
          </VStack>
        )}

        {hasCancelled && (
          <VStack gap={0}>
            <Text fontSize="2xl" fontWeight="bold" color="yellow.fg">
              {result.cancelledCount}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              Пропущено
            </Text>
          </VStack>
        )}
      </HStack>

      {/* Детальный список */}
      {result.results.length > 0 && (
        <Box maxH="300px" overflowY="auto" borderWidth={1} borderRadius="md">
          <VStack gap={0} align="stretch">
            {result.results.map((item, i) => (
              <HStack key={i} px={3} py={2} borderBottomWidth={1} borderColor="border.subtle">
                {item.result.success
                  ? (
                    <Badge size="sm" colorPalette="green" variant="subtle">
                      <LuCheck size={12} />
                    </Badge>
                  )
                  : (
                    <Badge size="sm" colorPalette="red" variant="subtle">
                      <LuX size={12} />
                    </Badge>
                  )}
                <Text fontSize="sm" flex={1} truncate>
                  {item.animeName}
                </Text>
                {!item.result.success && item.result.error && (
                  <Text fontSize="xs" color="red.fg" truncate maxW="200px" title={item.result.error}>
                    {item.result.error}
                  </Text>
                )}
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      {/* Кнопки */}
      <HStack gap={2} justify="flex-end">
        {hasErrors && (
          <Button variant="outline" onClick={onRetry} size="sm" gap={2}>
            <LuRefreshCw />
            Попробовать снова
          </Button>
        )}
        <Button colorPalette="blue" onClick={onClose} size="sm">
          Закрыть
        </Button>
      </HStack>
    </VStack>
  )
}
