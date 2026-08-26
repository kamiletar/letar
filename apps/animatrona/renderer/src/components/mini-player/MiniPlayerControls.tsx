'use client'

/**
 * MiniPlayerControls — упрощённые контролы для mini-player
 *
 * Содержит:
 * - Play/Pause кнопка
 * - Expand (вернуться к полному плееру)
 * - PiP (нативный Picture-in-Picture)
 * - Close (закрыть mini-player)
 */

import { Box, HStack, IconButton, Slider, Text } from '@chakra-ui/react'
import { memo } from 'react'
import { LuExpand, LuPause, LuPictureInPicture, LuPlay, LuX } from 'react-icons/lu'

import { Tooltip } from '@/components/ui/tooltip'

export interface MiniPlayerControlsProps {
  /** Видео воспроизводится */
  isPlaying: boolean
  /** Текущее время (секунды) */
  currentTime: number
  /** Длительность (секунды) */
  duration: number
  /** Toggle play/pause */
  onTogglePlay: () => void
  /** Развернуть (вернуться на страницу просмотра) */
  onExpand: () => void
  /** Переключить Picture-in-Picture */
  onTogglePiP: () => void
  /** Закрыть mini-player */
  onClose: () => void
  /** Перемотка к указанному времени (секунды) */
  onSeek: (time: number) => void
  /** Показывать контролы */
  isVisible: boolean
}

/**
 * Форматирует время в mm:ss
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) {
    return '0:00'
  }
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Упрощённые контролы для mini-player
 */
export const MiniPlayerControls = memo(function MiniPlayerControls({
  isPlaying,
  currentTime,
  duration,
  onTogglePlay,
  onExpand,
  onTogglePiP,
  onClose,
  onSeek,
  isVisible,
}: MiniPlayerControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Box
      position="absolute"
      inset={0}
      bg="blackAlpha.700"
      opacity={isVisible ? 1 : 0}
      pointerEvents={isVisible ? 'auto' : 'none'}
      transition="opacity 0.2s"
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
    >
      {/* Верхняя панель: Expand, PiP, Close */}
      <HStack justify="flex-end" p={1} gap={0}>
        <Tooltip content="Развернуть">
          <IconButton
            aria-label="Expand"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              onExpand()
            }}
          >
            <LuExpand />
          </IconButton>
        </Tooltip>
        <Tooltip content="Картинка в картинке">
          <IconButton
            aria-label="Picture in Picture"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              onTogglePiP()
            }}
          >
            <LuPictureInPicture />
          </IconButton>
        </Tooltip>
        <Tooltip content="Закрыть">
          <IconButton
            aria-label="Close"
            variant="ghost"
            colorPalette="whiteAlpha"
            size="xs"
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
          >
            <LuX />
          </IconButton>
        </Tooltip>
      </HStack>

      {/* Центр: Play/Pause */}
      <HStack justify="center" flex={1}>
        <IconButton
          aria-label={isPlaying ? 'Pause' : 'Play'}
          variant="ghost"
          colorPalette="whiteAlpha"
          size="lg"
          onClick={(e) => {
            e.stopPropagation()
            onTogglePlay()
          }}
        >
          {isPlaying ? <LuPause size={24} /> : <LuPlay size={24} />}
        </IconButton>
      </HStack>

      {/* Нижняя панель: время и прогресс */}
      <Box px={2} pb={1}>
        <Text fontSize="xs" color="white" textAlign="center" mb={1}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
        {/* Интерактивный seekbar */}
        <Slider.Root
          value={[progress]}
          min={0}
          max={100}
          step={0.1}
          onValueChange={(e) => {
            const time = (e.value[0] / 100) * duration
            onSeek(time)
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Slider.Control>
            <Slider.Track h="3px" bg="whiteAlpha.300">
              <Slider.Range bg="purple.400" />
            </Slider.Track>
            <Slider.Thumb index={0} boxSize={3} bg="white" />
          </Slider.Control>
        </Slider.Root>
      </Box>
    </Box>
  )
})
