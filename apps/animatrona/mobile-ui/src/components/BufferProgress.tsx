/**
 * BufferProgress — индикатор буферизации видео
 *
 * Серый слой под прогресс-баром показывает сколько видео загружено.
 */

import { Box } from '@chakra-ui/react'

interface BufferProgressProps {
  /** Буферизованное время (секунды) */
  bufferedTime: number
  /** Длительность видео (секунды) */
  duration: number
}

export function BufferProgress({ bufferedTime, duration }: BufferProgressProps) {
  const percent = duration > 0 ? (bufferedTime / duration) * 100 : 0

  return (
    <Box
      position="absolute"
      left={0}
      top="50%"
      transform="translateY(-50%)"
      h="8px"
      w={`${percent}%`}
      bg="white/30"
      borderRadius="4px"
      pointerEvents="none"
      transition="width 0.3s ease-out"
    />
  )
}
