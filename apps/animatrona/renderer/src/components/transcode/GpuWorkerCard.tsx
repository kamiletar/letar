'use client'

/**
 * Карточка GPU воркера
 *
 * Показывает состояние одного GPU энкодера:
 * - Имя файла
 * - Прогресс с процентами внутри
 * - FPS, скорость, битрейт
 * - CQ и VMAF скор (если подобран)
 *
 * Visual Improvements (v0.13):
 * - Progress bar с процентами внутри
 * - Glow effect для активного элемента
 * - Pulse animation для processing
 */

import { Badge, Box, Float, HStack, Icon, Progress, Text, VStack } from '@chakra-ui/react'
import { keyframes } from '@emotion/react'
import { memo, useMemo } from 'react'
import { LuCpu, LuMonitor, LuZap } from 'react-icons/lu'

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { formatDurationMs, formatSpeed } from '@/lib/format-utils'

/** Пульсирующая анимация для активной карточки */
const pulseAnimation = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
`

import type { ImportQueueVideoWorker } from '../../../../shared/types/import-queue'
import { FpsSparkline } from './FpsSparkline'

interface GpuWorkerCardProps {
  worker: ImportQueueVideoWorker
  /** Порядковый номер воркера (для отображения) */
  index: number
}

/** Вычисляет ETA на основе elapsed и прогресса */
function calculateEta(elapsedMs: number | undefined, progress: number): number | undefined {
  if (!elapsedMs || elapsedMs <= 0 || progress <= 0 || progress >= 100) {
    return undefined
  }
  return Math.round((elapsedMs * (100 - progress)) / progress)
}

/**
 * Мемоизированный компонент воркера GPU/CPU
 *
 * Сравнивает прогресс с допуском 1% для снижения re-renders
 */
export const GpuWorkerCard = memo(
  function GpuWorkerCard({ worker, index }: GpuWorkerCardProps) {
    const { fileName, progress, fps, fpsHistory, speed, bitrate, cq, vmafScore, useCpuFallback, elapsedMs } = worker
    const eta = calculateEta(elapsedMs, progress)
    const prefersReducedMotion = usePrefersReducedMotion()

    // Glow effect стили для активной карточки
    // При reduced motion — отключаем пульсацию, но оставляем glow
    const glowStyles = useMemo(
      () => ({
        boxShadow: useCpuFallback
          ? '0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          : '0 0 20px rgba(168, 85, 247, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        animation: !prefersReducedMotion && progress > 0 && progress < 100
          ? `${pulseAnimation} 2s ease-in-out infinite`
          : undefined,
      }),
      [useCpuFallback, progress, prefersReducedMotion],
    )

    return (
      <Box
        p={3}
        bg={useCpuFallback ? 'blue.950/50' : 'purple.950/50'}
        borderRadius="md"
        borderWidth="1px"
        borderColor={useCpuFallback ? 'blue.700/50' : 'purple.700/50'}
        minW="200px"
        css={glowStyles}
        transition="box-shadow 0.3s ease"
      >
        <VStack gap={2} align="stretch">
          {/* Заголовок */}
          <HStack justify="space-between">
            <HStack gap={2}>
              <Icon
                as={useCpuFallback ? LuCpu : LuMonitor}
                color={useCpuFallback ? 'blue.400' : 'purple.400'}
                boxSize={4}
              />
              <Text fontSize="sm" fontWeight="medium" color={useCpuFallback ? 'blue.300' : 'purple.300'}>
                {useCpuFallback ? `CPU #${index + 1}` : `GPU #${index + 1}`}
              </Text>
            </HStack>
            {cq !== undefined && (
              <Badge colorPalette={vmafScore ? 'green' : 'gray'} variant="subtle" size="sm">
                CQ {cq}
                {vmafScore && ` (${vmafScore.toFixed(1)})`}
              </Badge>
            )}
          </HStack>

          {/* Имя файла */}
          <Text fontSize="xs" color="fg.muted" lineClamp={1} title={fileName}>
            {fileName}
          </Text>

          {/* Прогресс с процентами внутри */}
          <Progress.Root value={progress} size="md" colorPalette={useCpuFallback ? 'blue' : 'purple'}>
            <Progress.Track h="20px" borderRadius="sm">
              <Progress.Range transition="width 0.3s ease" />
              {/* Проценты внутри прогресс-бара */}
              <Float placement="middle-center" w="full">
                <Text fontSize="xs" fontWeight="bold" color="white" textShadow="0 1px 2px rgba(0,0,0,0.5)">
                  {progress.toFixed(0)}%
                </Text>
              </Float>
            </Progress.Track>
          </Progress.Root>

          {/* Статистика с FPS sparkline */}
          <HStack justify="space-between" fontSize="xs" color="fg.muted">
            <HStack gap={2}>
              {fps !== undefined && fps > 0 && (
                <HStack gap={2}>
                  <Text>
                    <Text as="span" color={useCpuFallback ? 'blue.400' : 'green.400'} fontWeight="medium">
                      {fps.toFixed(0)}
                    </Text>
                    {' fps'}
                  </Text>
                  {/* FPS Sparkline */}
                  {fpsHistory && fpsHistory.length >= 3 && (
                    <FpsSparkline
                      data={fpsHistory}
                      colorPalette={useCpuFallback ? 'blue' : 'green'}
                      width={48}
                      height={16}
                    />
                  )}
                </HStack>
              )}
              {speed !== undefined && speed > 0 && (
                <HStack gap={1}>
                  <Icon as={LuZap} color="yellow.400" boxSize={3} />
                  <Text color="yellow.400" fontWeight="medium">
                    {formatSpeed(speed)}
                  </Text>
                </HStack>
              )}
            </HStack>
          </HStack>

          {/* Битрейт и время */}
          <HStack justify="space-between" fontSize="xs" color="fg.muted">
            {bitrate !== undefined && bitrate > 0 && <Text>{(bitrate / 1000).toFixed(1)} Mbps</Text>}
            {elapsedMs !== undefined && elapsedMs > 0 && (
              <Text>
                ⏱ {formatDurationMs(elapsedMs)}
                {eta !== undefined && ` / ~${formatDurationMs(eta)}`}
              </Text>
            )}
          </HStack>
        </VStack>
      </Box>
    )
  },
  (prev, next) => {
    // Custom comparator: пропускаем render если критичные поля не изменились

    if (prev.index !== next.index) {
      return false
    }
    if (prev.worker.fileName !== next.worker.fileName) {
      return false
    }
    if (prev.worker.useCpuFallback !== next.worker.useCpuFallback) {
      return false
    }
    if (prev.worker.cq !== next.worker.cq) {
      return false
    }

    // Прогресс — с допуском 1%
    if (Math.abs(prev.worker.progress - next.worker.progress) >= 1) {
      return false
    }

    // FPS и speed — с допуском для снижения re-renders
    const prevFps = prev.worker.fps ?? 0
    const nextFps = next.worker.fps ?? 0
    if (Math.abs(prevFps - nextFps) >= 2) {
      return false
    }

    const prevSpeed = prev.worker.speed ?? 0
    const nextSpeed = next.worker.speed ?? 0
    if (Math.abs(prevSpeed - nextSpeed) >= 0.05) {
      return false
    }

    // FPS history — только если длина изменилась значительно (новые точки)
    const prevHistoryLen = prev.worker.fpsHistory?.length ?? 0
    const nextHistoryLen = next.worker.fpsHistory?.length ?? 0
    if (nextHistoryLen - prevHistoryLen >= 2) {
      return false
    }

    return true
  },
)
