/**
 * SeekPreview — превью времени при перемотке
 *
 * Показывает большой таймкод и delta времени над ползунком при seek.
 */

import { Box, Text, VStack } from '@chakra-ui/react'

interface SeekPreviewProps {
  /** Превью времени (секунды) */
  time: number
  /** Текущее время (для показа delta) */
  currentTime: number
  /** Показывать превью */
  visible: boolean
}

/** Форматирование времени в MM:SS или HH:MM:SS */
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Форматирование delta времени */
function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : ''
  const absDelta = Math.abs(delta)
  const m = Math.floor(absDelta / 60)
  const s = Math.floor(absDelta % 60)

  if (m > 0) {
    return `${sign}${m}:${s.toString().padStart(2, '0')}`
  }
  return `${sign}${s} сек`
}

export function SeekPreview({ time, currentTime, visible }: SeekPreviewProps) {
  const delta = time - currentTime

  return (
    <Box
      position="absolute"
      top="-80px"
      left="50%"
      transform="translateX(-50%)"
      zIndex={100}
      pointerEvents="none"
      opacity={visible ? 1 : 0}
      transition="opacity 0.15s ease-out"
    >
      <VStack gap={0} p={3} borderRadius="lg" bg="black/80" backdropFilter="blur(8px)" minW="100px" textAlign="center">
        {/* Основное время */}
        <Text color="white" fontSize="2xl" fontWeight="bold" lineHeight={1}>
          {formatTime(time)}
        </Text>

        {/* Delta */}
        <Text color={delta >= 0 ? 'green.400' : 'red.400'} fontSize="sm" fontWeight="medium">
          {formatDelta(delta)}
        </Text>
      </VStack>
    </Box>
  )
}
