'use client'

/**
 * Карточка прогресса VMAF подбора CQ
 *
 * Показывает:
 * - Целевой VMAF
 * - Текущую итерацию и общий прогресс
 * - Историю итераций (CQ → VMAF скор)
 * - Текущий этап (extracting/encoding/calculating)
 */

import { Badge, Box, Card, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import { LuCheck, LuCpu, LuTarget, LuTrendingDown, LuTrendingUp, LuZap } from 'react-icons/lu'

import { formatBytes } from '@/lib/format-utils'
import type { ImportQueueEntry } from '../../../../shared/types/import-queue'
import type { CqIteration } from '../../../../shared/types/vmaf'

interface VmafProgressCardProps {
  /** Элемент очереди */
  item: ImportQueueEntry
}

/** Форматирует время в мс → читаемый вид */
function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000)
  if (sec < 60) {
    return `${sec}с`
  }
  const min = Math.floor(sec / 60)
  const secRem = sec % 60
  return `${min}м ${secRem}с`
}

/** Вычисляет ожидаемый размер полного файла на основе сэмпла */
function estimateFullSize(sampleSize: number, sampleDuration = 80, fullDuration = 1440): number {
  // По умолчанию 80 сек сэмплов (4x20), 24 мин полного видео
  return Math.round((sampleSize / sampleDuration) * fullDuration)
}

/** Вычисляет % экономии */
function calcSavings(estimatedSize: number, originalSize: number): number {
  if (originalSize <= 0) {
    return 0
  }
  return Math.max(0, ((originalSize - estimatedSize) / originalSize) * 100)
}

/** Получает направление поиска */
function getDirection(iteration: CqIteration, targetVmaf: number): 'up' | 'down' | null {
  if (iteration.vmaf > targetVmaf + 0.5) {
    return 'up'
  } // Нужно увеличить CQ (снизить качество)
  if (iteration.vmaf < targetVmaf - 0.5) {
    return 'down'
  } // Нужно уменьшить CQ (повысить качество)
  return null
}

export function VmafProgressCard({ item }: VmafProgressCardProps) {
  const { vmafSettings, vmafProgress, selectedAnime } = item
  const targetVmaf = vmafSettings?.targetVmaf ?? 94
  const animeName = selectedAnime.russian || selectedAnime.name

  // Если VMAF не активен или нет прогресса
  if (item.status !== 'vmaf' || !vmafProgress) {
    return null
  }

  const progress = (vmafProgress.currentIteration / vmafProgress.totalIterations) * 100

  // Используем массив итераций из прогресса
  const iterations: CqIteration[] = vmafProgress.iterations ?? []
  const originalSize = vmafProgress.originalSize ?? 0

  return (
    <Card.Root bg="yellow.950/30" borderColor="yellow.700/50" variant="outline">
      <Card.Header py={3} px={4}>
        <HStack justify="space-between">
          <HStack gap={2}>
            <Icon as={LuTarget} color="yellow.400" boxSize={5} />
            <VStack align="start" gap={0}>
              <Text fontWeight="semibold" color="yellow.200">
                VMAF подбор CQ
              </Text>
              <Text fontSize="sm" color="yellow.300" lineClamp={1}>
                {animeName}
              </Text>
            </VStack>
          </HStack>

          <Badge colorPalette="yellow" size="lg" px={3}>
            Цель: {targetVmaf}
          </Badge>
        </HStack>
      </Card.Header>

      <Card.Body pt={0} pb={4} px={4}>
        <VStack gap={4} align="stretch">
          {/* Прогресс */}
          <Box>
            <HStack justify="space-between" mb={1}>
              <Text fontSize="sm" color="yellow.300">
                Итерация {vmafProgress.currentIteration} из ~{vmafProgress.totalIterations}
              </Text>
              <Text fontSize="sm" color="yellow.300" fontWeight="medium">
                {progress.toFixed(0)}%
              </Text>
            </HStack>
            <Progress.Root value={progress} size="md" colorPalette="yellow">
              <Progress.Track bg="yellow.900/50">
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          </Box>

          {/* Текущий этап */}
          <HStack gap={2} p={3} bg="yellow.900/30" borderRadius="md" justify="center">
            <Icon
              as={vmafProgress.stage === 'encoding' ? LuZap : LuCpu}
              color="yellow.400"
              boxSize={4}
              animation={vmafProgress.stage !== 'done' ? 'spin 2s linear infinite' : undefined}
            />
            <Text fontSize="sm" color="yellow.300">
              {vmafProgress.stage === 'extracting' && 'Извлечение сэмплов из видео...'}
              {vmafProgress.stage === 'encoding' && `Кодирование с CQ ${vmafProgress.currentCq ?? '?'}...`}
              {vmafProgress.stage === 'calculating' && 'Расчёт VMAF скора...'}
              {vmafProgress.stage === 'done' && 'Завершено'}
            </Text>
            {/* CPU fallback индикатор */}
            {vmafProgress.useCpuFallback && (
              <Badge colorPalette="blue" size="sm">
                CPU
              </Badge>
            )}
          </HStack>

          {/* Текущий CQ и последний VMAF */}
          {(vmafProgress.currentCq !== undefined || vmafProgress.lastVmaf !== undefined) && (
            <HStack justify="space-around" py={2}>
              {vmafProgress.currentCq !== undefined && (
                <VStack gap={0}>
                  <Text fontSize="2xl" fontWeight="bold" color="yellow.300">
                    {vmafProgress.currentCq}
                  </Text>
                  <Text fontSize="xs" color="yellow.400">
                    Текущий CQ
                  </Text>
                </VStack>
              )}
              {vmafProgress.lastVmaf !== undefined && (
                <VStack gap={0}>
                  <Text
                    fontSize="2xl"
                    fontWeight="bold"
                    color={vmafProgress.lastVmaf >= targetVmaf - 0.5 && vmafProgress.lastVmaf <= targetVmaf + 0.5
                      ? 'green.400'
                      : 'yellow.300'}
                  >
                    {vmafProgress.lastVmaf.toFixed(1)}
                  </Text>
                  <Text fontSize="xs" color="yellow.400">
                    Последний VMAF
                  </Text>
                </VStack>
              )}
            </HStack>
          )}

          {/* История итераций */}
          {iterations.length > 0 && (
            <Box>
              <Text fontSize="xs" color="yellow.400" mb={2}>
                Найденные CQ:
              </Text>
              <VStack gap={1} align="stretch">
                {iterations.map((iter, idx) => {
                  const direction = getDirection(iter, targetVmaf)
                  const isOptimal = !direction
                  const estimatedSize = estimateFullSize(iter.size)
                  const savings = calcSavings(estimatedSize, originalSize)
                  return (
                    <HStack
                      key={idx}
                      justify="space-between"
                      p={2}
                      bg={isOptimal ? 'green.900/30' : 'yellow.900/20'}
                      borderRadius="sm"
                      fontSize="sm"
                    >
                      <HStack gap={2}>
                        {isOptimal
                          ? <Icon as={LuCheck} color="green.400" boxSize={4} />
                          : direction === 'up'
                          ? <Icon as={LuTrendingUp} color="orange.400" boxSize={4} />
                          : <Icon as={LuTrendingDown} color="blue.400" boxSize={4} />}
                        <Text color={isOptimal ? 'green.300' : 'yellow.300'}>CQ {iter.cq}</Text>
                        <Text color="fg.muted">→</Text>
                        <Text fontWeight="medium" color={isOptimal ? 'green.400' : 'yellow.300'}>
                          VMAF {iter.vmaf.toFixed(1)}
                        </Text>
                      </HStack>
                      <HStack gap={2} fontSize="xs">
                        <Text color="fg.muted">{formatTime(iter.encodingTime + iter.vmafTime)}</Text>
                        <Text color="fg.muted">~{formatBytes(estimatedSize)}</Text>
                        {savings > 0 && (
                          <Badge
                            colorPalette={savings > 50 ? 'green' : savings > 30 ? 'yellow' : 'orange'}
                            size="sm"
                            variant="subtle"
                          >
                            -{savings.toFixed(0)}%
                          </Badge>
                        )}
                      </HStack>
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
