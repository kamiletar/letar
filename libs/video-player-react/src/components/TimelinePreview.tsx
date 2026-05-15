'use client'

/**
 * TimelinePreview — hover preview кадра на прогресс-баре
 *
 * Показывает фрагмент sprite sheet при наведении на таймлайн.
 * Позиционируется над прогресс-баром, зажат в границах контейнера.
 */

import { Box, Text } from '@chakra-ui/react'
import { memo, useMemo } from 'react'

import { formatTime } from '../utils/format-time'
import type { SpriteCue } from '../utils/sprite-vtt'
import { findCueAtTime } from '../utils/sprite-vtt'

export interface TimelinePreviewProps {
  /** URL спрайт-изображения */
  spriteUrl: string
  /** Распарсенные cues */
  cues: SpriteCue[]
  /** Время для показа (секунды) */
  hoverTime: number
  /** Позиция курсора на прогресс-баре (px от левого края) */
  cursorX: number
  /** Ширина контейнера прогресс-бара (px) */
  containerWidth: number
}

/** Размер превью (совпадает с размером кадра в спрайте) */
const PREVIEW_WIDTH = 160
const PREVIEW_HEIGHT = 90

/**
 * Hover preview кадра из sprite sheet
 */
export const TimelinePreview = memo(function TimelinePreview({
  spriteUrl,
  cues,
  hoverTime,
  cursorX,
  containerWidth,
}: TimelinePreviewProps) {
  const cue = useMemo(() => findCueAtTime(cues, hoverTime), [cues, hoverTime])

  if (!cue) {
    return null
  }

  // Позиционирование: центрируем над курсором, зажимаем в границах
  const halfWidth = PREVIEW_WIDTH / 2
  let left = cursorX - halfWidth
  // Не выходим за левую границу
  if (left < 0) {
    left = 0
  }
  // Не выходим за правую границу
  if (left + PREVIEW_WIDTH > containerWidth) {
    left = containerWidth - PREVIEW_WIDTH
  }

  return (
    <Box
      position="absolute"
      bottom="calc(100% + 8px)"
      left={`${left}px`}
      width={`${PREVIEW_WIDTH}px`}
      zIndex={10}
      pointerEvents="none"
    >
      {/* Кадр из спрайта */}
      <Box
        width={`${PREVIEW_WIDTH}px`}
        height={`${PREVIEW_HEIGHT}px`}
        overflow="hidden"
        borderRadius="md"
        border="2px solid"
        borderColor="whiteAlpha.400"
        boxShadow="lg"
        backgroundImage={`url(${spriteUrl})`}
        backgroundPosition={`-${cue.x}px -${cue.y}px`}
        backgroundSize="auto"
        backgroundRepeat="no-repeat"
      />

      {/* Метка времени */}
      <Text
        fontSize="xs"
        color="white"
        textAlign="center"
        mt={1}
        bg="blackAlpha.700"
        borderRadius="sm"
        px={1.5}
        py={0.5}
        width="fit-content"
        mx="auto"
      >
        {formatTime(hoverTime)}
      </Text>
    </Box>
  )
})
