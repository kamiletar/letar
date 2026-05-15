'use client'

/**
 * Панель активных воркеров
 *
 * Показывает сетку GPU и CPU воркеров с их текущим состоянием
 * + список завершённых видео-файлов с экономией размера.
 */

import { Badge, Box, Card, Grid, HStack, Icon, Text, VStack, Wrap } from '@chakra-ui/react'
import { LuCheck, LuCpu, LuFilm, LuMonitor, LuTrendingDown } from 'react-icons/lu'

import type { ImportQueueDetailProgress } from '../../../../shared/types/import-queue'
import { CpuWorkerCard } from './CpuWorkerCard'
import { GpuWorkerCard } from './GpuWorkerCard'

interface ActiveWorkersPanelProps {
  /** Детальный прогресс с данными о воркерах */
  progress: ImportQueueDetailProgress
}

/** Форматирование размера */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function ActiveWorkersPanel({ progress }: ActiveWorkersPanelProps) {
  const {
    videoWorkers = [],
    audioWorkers = [],
    completedVideoFiles = [],
    videoTotal = 0,
    videoCompleted = 0,
    audioTotal = 0,
    audioCompleted = 0,
  } = progress

  // Фильтруем только активные воркеры
  const activeVideoWorkers = videoWorkers.filter((w) => w.progress < 100)
  const activeAudioWorkers = audioWorkers.filter((w) => w.status === 'running')
  const completedAudioWorkers = audioWorkers.filter((w) => w.status === 'completed').slice(0, 3)

  // Итоги по экономии (для сводной строки)
  const totalSourceSize = completedVideoFiles.reduce((s, f) => s + (f.sourceSize ?? 0), 0)
  const totalTranscodedSize = completedVideoFiles.reduce((s, f) => s + (f.transcodedSize ?? 0), 0)
  const totalSavingPercent = totalSourceSize > 0
    ? Math.round((1 - totalTranscodedSize / totalSourceSize) * 100)
    : 0

  // Если нет ни активных воркеров, ни завершённых файлов — не показываем панель
  if (activeVideoWorkers.length === 0 && activeAudioWorkers.length === 0 && completedVideoFiles.length === 0) {
    return null
  }

  return (
    <Card.Root bg="bg.subtle" variant="outline" borderColor="border.subtle">
      <Card.Header py={2} px={3}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="medium" color="fg.muted">
            Активные воркеры
          </Text>
          <HStack gap={3}>
            {videoTotal > 0 && (
              <HStack gap={1}>
                <Icon as={LuMonitor} boxSize={3} color="purple.400" />
                <Badge colorPalette="purple" variant="subtle" size="sm">
                  {videoCompleted}/{videoTotal} видео
                </Badge>
              </HStack>
            )}
            {audioTotal > 0 && (
              <HStack gap={1}>
                <Icon as={LuCpu} boxSize={3} color="green.400" />
                <Badge colorPalette="green" variant="subtle" size="sm">
                  {audioCompleted}/{audioTotal} аудио
                </Badge>
              </HStack>
            )}
          </HStack>
        </HStack>
      </Card.Header>

      <Card.Body pt={0} pb={3} px={3}>
        <VStack gap={3} align="stretch">
          {/* GPU воркеры (видео) */}
          {activeVideoWorkers.length > 0 && (
            <Box role="region" aria-label={`GPU воркеры: ${activeVideoWorkers.length} активных`}>
              <HStack gap={1} mb={2}>
                <Icon as={LuMonitor} boxSize={3} color="purple.400" />
                <Text fontSize="xs" color="fg.muted">
                  Видео-потоки
                </Text>
              </HStack>
              <Grid
                templateColumns={{
                  base: '1fr',
                  sm: activeVideoWorkers.length > 1 ? 'repeat(2, 1fr)' : '1fr',
                  lg: activeVideoWorkers.length > 2
                    ? 'repeat(3, 1fr)'
                    : activeVideoWorkers.length > 1
                    ? 'repeat(2, 1fr)'
                    : '1fr',
                }}
                gap={2}
              >
                {activeVideoWorkers.map((worker, idx) => (
                  <GpuWorkerCard key={`video-${idx}`} worker={worker} index={idx} />
                ))}
              </Grid>
            </Box>
          )}

          {/* CPU воркеры (аудио) */}
          {(activeAudioWorkers.length > 0 || completedAudioWorkers.length > 0) && (
            <Box
              role="region"
              aria-label={`CPU воркеры: ${activeAudioWorkers.length} активных, ${completedAudioWorkers.length} завершённых`}
            >
              <HStack gap={1} mb={2}>
                <Icon as={LuCpu} boxSize={3} color="green.400" />
                <Text fontSize="xs" color="fg.muted">
                  Аудио-дорожки
                </Text>
              </HStack>
              <Wrap gap={2} role="list">
                {/* Активные */}
                {activeAudioWorkers.map((worker) => <CpuWorkerCard key={worker.workerId} worker={worker} />)}
                {/* Последние завершённые (для контекста) */}
                {completedAudioWorkers.map((worker) => <CpuWorkerCard key={worker.workerId} worker={worker} />)}
              </Wrap>
            </Box>
          )}

          {/* Завершённые видео-файлы с экономией размера */}
          {completedVideoFiles.length > 0 && (
            <Box role="region" aria-label={`Завершённые файлы: ${completedVideoFiles.length}`}>
              <HStack gap={2} mb={2} justify="space-between">
                <HStack gap={1}>
                  <Icon as={LuCheck} boxSize={3} color="green.400" />
                  <Text fontSize="xs" color="fg.muted">
                    Завершённые файлы ({completedVideoFiles.length})
                  </Text>
                </HStack>
                {totalSourceSize > 0 && totalTranscodedSize > 0 && (
                  <HStack gap={1}>
                    <Icon as={LuTrendingDown} boxSize={3} color="green.400" />
                    <Text fontSize="xs" color="green.400" fontWeight="medium">
                      {formatSize(totalSourceSize)} → {formatSize(totalTranscodedSize)} (−{totalSavingPercent}%)
                    </Text>
                  </HStack>
                )}
              </HStack>
              <VStack gap={1} align="stretch" role="list">
                {completedVideoFiles.map((file) => {
                  const hasSizes = file.sourceSize !== undefined
                    && file.transcodedSize !== undefined
                    && file.sourceSize > 0
                  const savingPercent = hasSizes
                    ? Math.round((1 - (file.transcodedSize as number) / (file.sourceSize as number)) * 100)
                    : 0
                  return (
                    <HStack
                      key={file.fileName}
                      gap={2}
                      p={2}
                      borderRadius="md"
                      bg="bg.muted"
                      borderWidth="1px"
                      borderColor="border.subtle"
                      role="listitem"
                    >
                      <Icon as={LuFilm} boxSize={3} color="fg.muted" />
                      <Text fontSize="xs" flex={1} truncate title={file.fileName}>
                        {file.fileName}
                      </Text>
                      {file.cq !== undefined && (
                        <Badge size="xs" variant="subtle" colorPalette="purple">
                          CQ {file.cq}
                        </Badge>
                      )}
                      {hasSizes
                        ? (
                          <HStack gap={1} fontSize="xs">
                            <Text color="fg.muted">{formatSize(file.sourceSize as number)}</Text>
                            <Text color="fg.muted">→</Text>
                            <Text color="fg" fontWeight="medium">{formatSize(file.transcodedSize as number)}</Text>
                            <Badge size="xs" variant="subtle" colorPalette={savingPercent > 0 ? 'green' : 'red'}>
                              {savingPercent > 0 ? '−' : '+'}
                              {Math.abs(savingPercent)}%
                            </Badge>
                          </HStack>
                        )
                        : (
                          <Text fontSize="xs" color="fg.muted">
                            размер недоступен
                          </Text>
                        )}
                    </HStack>
                  )
                })}
              </VStack>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
