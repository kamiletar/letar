'use client'

/**
 * Шаг прогресса пакетной публикации
 */

import { Badge, Box, Button, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuSquare, LuX } from 'react-icons/lu'

import type { BatchItemProgress } from './use-batch-publish'

interface ProgressStepProps {
  current: number
  total: number
  currentAnimeName: string
  processedItems: BatchItemProgress[]
  isPublishing: boolean
  onCancel: () => void
}

export function ProgressStep({
  current,
  total,
  currentAnimeName,
  processedItems,
  isPublishing,
  onCancel,
}: ProgressStepProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <VStack gap={4} align="stretch">
      {/* Прогресс бар */}
      <Box>
        <HStack justify="space-between" mb={2}>
          <Text fontSize="sm" fontWeight="medium">
            {isPublishing ? `Публикация: ${current} из ${total}` : `Завершено: ${current} из ${total}`}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {percent}%
          </Text>
        </HStack>
        <Progress.Root value={percent} size="md">
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>
      </Box>

      {/* Текущий элемент */}
      {isPublishing && currentAnimeName && (
        <Box p={3} bg="bg.subtle" borderRadius="md">
          <Text fontSize="sm" color="fg.muted">
            Публикация:
          </Text>
          <Text fontSize="sm" fontWeight="medium">
            {currentAnimeName}
          </Text>
        </Box>
      )}

      {/* Список обработанных */}
      <Box maxH="300px" overflowY="auto" borderWidth={1} borderRadius="md">
        {processedItems.length === 0 ? (
          <Box p={4} textAlign="center">
            <Text fontSize="sm" color="fg.muted">
              Ожидание...
            </Text>
          </Box>
        ) : (
          <VStack gap={0} align="stretch">
            {processedItems.map((item, i) => (
              <HStack key={i} px={3} py={2} borderBottomWidth={1} borderColor="border.subtle">
                {item.result?.success ? (
                  <Badge size="sm" colorPalette="green" variant="subtle">
                    <Icon as={LuCheck} boxSize={3} />
                  </Badge>
                ) : (
                  <Badge size="sm" colorPalette="red" variant="subtle">
                    <Icon as={LuX} boxSize={3} />
                  </Badge>
                )}
                <Text fontSize="sm" flex={1} truncate>
                  {item.animeName}
                </Text>
                {item.result && !item.result.success && item.result.error && (
                  <Text fontSize="xs" color="red.fg" truncate maxW="200px" title={item.result.error}>
                    {item.result.error}
                  </Text>
                )}
              </HStack>
            ))}
          </VStack>
        )}
      </Box>

      {/* Кнопка отмены */}
      {isPublishing && (
        <Button variant="outline" colorPalette="red" onClick={onCancel} size="sm">
          <Icon as={LuSquare} mr={2} />
          Остановить
        </Button>
      )}
    </VStack>
  )
}
