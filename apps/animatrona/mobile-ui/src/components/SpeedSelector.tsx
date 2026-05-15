/**
 * SpeedSelector — выбор скорости воспроизведения
 */

import { Box, Text, VStack } from '@chakra-ui/react'
import { LuCheck } from 'react-icons/lu'

/** Доступные скорости воспроизведения */
export const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

interface SpeedSelectorProps {
  /** Текущая скорость */
  currentSpeed: PlaybackSpeed
  /** Обработчик выбора скорости */
  onSpeedChange: (speed: PlaybackSpeed) => void
  /** Видимость меню */
  visible: boolean
  /** Закрытие меню */
  onClose: () => void
}

/** Форматирование скорости для отображения */
function formatSpeed(speed: PlaybackSpeed): string {
  if (speed === 1) {
    return 'Обычная'
  }
  return `${speed}x`
}

export function SpeedSelector({ currentSpeed, onSpeedChange, visible, onClose }: SpeedSelectorProps) {
  if (!visible) {
    return null
  }

  return (
    <Box
      position="absolute"
      inset={0}
      bg="black/80"
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={100}
      onClick={(e) => {
        e.stopPropagation()
        onClose()
      }}
    >
      <Box
        bg="gray.900"
        borderRadius="xl"
        p={4}
        minW="200px"
        maxH="80vh"
        overflowY="auto"
        onClick={(e) => e.stopPropagation()}
      >
        <Text color="gray.400" fontSize="sm" mb={3} px={2}>
          Скорость воспроизведения
        </Text>

        <VStack gap={1} align="stretch">
          {PLAYBACK_SPEEDS.map((speed) => (
            <Box
              key={speed}
              as="button"
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              p={3}
              bg={currentSpeed === speed ? 'purple.900' : 'transparent'}
              borderRadius="lg"
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ bg: currentSpeed === speed ? 'purple.800' : 'gray.800' }}
              onClick={() => {
                onSpeedChange(speed)
                onClose()
              }}
            >
              <Text color="white" fontWeight={currentSpeed === speed ? 'semibold' : 'normal'}>
                {formatSpeed(speed)}
              </Text>
              {currentSpeed === speed && <LuCheck size={20} color="var(--chakra-colors-purple-400)" />}
            </Box>
          ))}
        </VStack>
      </Box>
    </Box>
  )
}
