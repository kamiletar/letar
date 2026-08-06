'use client'

import { Box, Card, Grid, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { LuActivity, LuClock, LuGauge, LuHardDrive, LuTimer, LuTrendingDown } from 'react-icons/lu'

import {
  calculateCompressionRatio,
  formatBitrateKbps,
  formatBytes,
  formatDurationHuman,
  formatDurationMs,
  formatFps,
  formatSpeed,
} from '@/lib/format-utils'
import type { TranscodeProgressExtended } from '../../../../shared/types'

interface TranscodeStatsProps {
  /** Прогресс транскодирования */
  progress: TranscodeProgressExtended | undefined
  /** Размер входного файла */
  inputSize?: number
}

interface StatItemProps {
  icon: React.ElementType
  label: string
  value: string
  color?: string
}

/**
 * Элемент статистики
 */
function StatItem({ icon, label, value, color = 'fg.muted' }: StatItemProps) {
  return (
    <HStack gap={3}>
      <Box p={2} borderRadius="md" bg="bg.muted">
        <Icon as={icon} boxSize={4} color={color} />
      </Box>
      <VStack align="start" gap={0}>
        <Text fontSize="xs" color="fg.muted">
          {label}
        </Text>
        <Text fontSize="sm" fontWeight="medium">
          {value}
        </Text>
      </VStack>
    </HStack>
  )
}

/**
 * Панель статистики транскодирования
 *
 * Отображает:
 * - FPS
 * - Скорость (1.5x, 2.3x)
 * - Прошло / ETA
 * - Размер / сжатие
 * - Битрейт
 */
export function TranscodeStats({ progress, inputSize }: TranscodeStatsProps) {
  if (!progress) {
    return null
  }

  const compressionRatio = calculateCompressionRatio(inputSize, progress.outputSize)
  const eta = progress.speed && progress.currentTime && progress.totalDuration
    ? (progress.totalDuration - progress.currentTime) / progress.speed
    : undefined

  return (
    <Card.Root bg="bg.subtle" border="1px" borderColor="border.subtle">
      <Card.Body py={3}>
        <Grid templateColumns="repeat(3, 1fr)" gap={4}>
          {/* FPS */}
          <StatItem icon={LuActivity} label="FPS" value={formatFps(progress.fps)} color="status.success" />

          {/* Скорость */}
          <StatItem
            icon={LuGauge}
            label="Скорость"
            value={formatSpeed(progress.speed)}
            color={progress.speed && progress.speed >= 1 ? 'status.success' : 'status.warning'}
          />

          {/* Битрейт */}
          <StatItem
            icon={LuTrendingDown}
            label="Битрейт"
            value={formatBitrateKbps(progress.bitrate)}
            color="status.info"
          />

          {/* Прошло времени */}
          <StatItem icon={LuClock} label="Прошло" value={formatDurationMs(progress.elapsedTime)} color="primary.fg" />

          {/* ETA */}
          <StatItem icon={LuTimer} label="Осталось" value={formatDurationHuman(eta)} color="accent.fg" />

          {/* Размер и сжатие */}
          <StatItem
            icon={LuHardDrive}
            label="Размер"
            value={compressionRatio !== undefined
              ? `${formatBytes(progress.outputSize)} (${compressionRatio.toFixed(0)}%)`
              : formatBytes(progress.outputSize)}
            color="accent.solid"
          />
        </Grid>
      </Card.Body>
    </Card.Root>
  )
}
