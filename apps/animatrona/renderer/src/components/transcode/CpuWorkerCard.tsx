'use client'

/**
 * Карточка CPU воркера (аудио кодирование)
 *
 * Компактное отображение прогресса аудио-дорожки
 */

import { Box, HStack, Icon, Progress, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { LuCheck, LuMusic } from 'react-icons/lu'

import type { ImportQueueAudioWorker } from '../../../../shared/types/import-queue'

interface CpuWorkerCardProps {
  worker: ImportQueueAudioWorker
}

export const CpuWorkerCard = memo(
  function CpuWorkerCard({ worker }: CpuWorkerCardProps) {
    const { name, language, progress, status } = worker
    const isCompleted = status === 'completed'
    const displayName = name || language || 'Audio'

    return (
      <Box
        px={2}
        py={1.5}
        bg={isCompleted ? 'green.900/30' : 'green.950/50'}
        borderRadius="md"
        borderWidth="1px"
        borderColor={isCompleted ? 'green.700/50' : 'green.800/30'}
        minW="100px"
      >
        <HStack gap={2}>
          <Icon as={isCompleted ? LuCheck : LuMusic} color={isCompleted ? 'green.400' : 'green.500'} boxSize={3} />
          <Text
            fontSize="xs"
            color={isCompleted ? 'green.400' : 'green.300'}
            fontWeight="medium"
            lineClamp={1}
            flex={1}
          >
            {displayName}
          </Text>
          {!isCompleted && (
            <Text fontSize="xs" color="green.400" fontWeight="medium">
              {progress.toFixed(0)}%
            </Text>
          )}
        </HStack>

        {/* Мини прогресс-бар для активных */}
        {!isCompleted && (
          <Progress.Root value={progress} size="xs" colorPalette="green" mt={1}>
            <Progress.Track bg="green.900/50" h="2px">
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        )}
      </Box>
    )
  },
  (prev, next) => {
    // Custom comparator: пропускаем render если критичные поля не изменились
    if (prev.worker.status !== next.worker.status) {
      return false
    }
    if (prev.worker.name !== next.worker.name) {
      return false
    }

    // Прогресс — с допуском 2%
    if (Math.abs(prev.worker.progress - next.worker.progress) >= 2) {
      return false
    }

    return true
  },
)
