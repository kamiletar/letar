'use client'

/**
 * Карточка прогресса текущего тура швейцарки.
 * Показывает номер тура, общий прогресс и разбивку по W-L ячейкам сетки.
 */

import { Badge, Box, Flex, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { LuCircleCheck, LuCirclePlay, LuClock } from 'react-icons/lu'

export interface SwissCell {
  /** W-L ключ, напр. "2-0", "1-1" */
  key: string
  total: number
  finished: number
  live: number
}

export interface SwissProgress {
  roundNumber: number
  roundName: string
  totalMatches: number
  finishedMatches: number
  liveMatches: number
  scheduledMatches: number
  allFinished: boolean
  cells?: SwissCell[]
}

interface SwissProgressCardProps {
  progress: SwissProgress | null
}

export function SwissProgressCard({ progress }: SwissProgressCardProps) {
  if (!progress) {
    return (
      <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
        <Text color="fg.muted" fontSize="sm">
          Туры ещё не создавались. Нажмите «Сгенерировать тур» для начала.
        </Text>
      </Box>
    )
  }

  const pct = progress.totalMatches > 0 ? Math.round((progress.finishedMatches / progress.totalMatches) * 100) : 0

  return (
    <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px" borderColor="border.muted">
      <VStack gap={3} align="stretch">
        {/* Заголовок */}
        <Flex justify="space-between" align="center">
          <HStack gap={2}>
            <Text fontWeight="bold" fontSize="md">
              Тур {progress.roundNumber}
            </Text>
            {progress.allFinished
              ? (
                <Badge colorPalette="green" size="sm">
                  Завершён
                </Badge>
              )
              : (
                <Badge colorPalette="blue" size="sm">
                  В процессе
                </Badge>
              )}
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            {progress.finishedMatches} / {progress.totalMatches} матчей
          </Text>
        </Flex>

        {/* Общий прогресс */}
        <Progress.Root value={pct} size="sm" colorPalette={progress.allFinished ? 'green' : 'blue'}>
          <Progress.Track>
            <Progress.Range />
          </Progress.Track>
        </Progress.Root>

        {/* W-L ячейки сетки */}
        {progress.cells && progress.cells.length > 0 && (
          <Flex gap={3} flexWrap="wrap">
            {progress.cells.map((cell) => {
              const cellFinished = cell.finished === cell.total
              const cellPct = cell.total > 0 ? Math.round((cell.finished / cell.total) * 100) : 0
              return (
                <Box
                  key={cell.key}
                  flex="1"
                  minW="120px"
                  p={2}
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={cellFinished ? 'green.500/30' : 'border.muted'}
                  bg={cellFinished ? 'green.500/5' : 'bg.subtle'}
                >
                  <Flex justify="space-between" align="center" mb={1}>
                    <Badge colorPalette={cellFinished ? 'green' : 'gray'} size="sm" fontFamily="mono">
                      {cell.key}
                    </Badge>
                    <Text fontSize="xs" color="fg.muted">
                      {cell.finished}/{cell.total}
                    </Text>
                  </Flex>
                  <Progress.Root value={cellPct} size="xs" colorPalette={cellFinished ? 'green' : 'blue'}>
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                </Box>
              )
            })}
          </Flex>
        )}

        {/* Общая статистика */}
        <HStack gap={4} fontSize="xs" color="fg.muted">
          <HStack gap={1}>
            <LuCircleCheck size={14} />
            <Text>Завершено: {progress.finishedMatches}</Text>
          </HStack>
          {progress.liveMatches > 0 && (
            <HStack gap={1}>
              <LuCirclePlay size={14} />
              <Text>Идёт: {progress.liveMatches}</Text>
            </HStack>
          )}
          {progress.scheduledMatches > 0 && (
            <HStack gap={1}>
              <LuClock size={14} />
              <Text>Ожидают: {progress.scheduledMatches}</Text>
            </HStack>
          )}
        </HStack>
      </VStack>
    </Box>
  )
}
