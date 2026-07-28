'use client'

import { Box, type BoxProps } from '@chakra-ui/react'

interface ScoreBarProps extends Omit<BoxProps, 'children'> {
  /** Значение в процентах (0–100). Больше 100 зажимается, меньше 0 — тоже */
  value: number
  /** Цвет заполненной части — токен Chakra */
  color?: string
  /** Цвет трека */
  trackColor?: string
  /** Высота полосы */
  height?: string
  /** Анимировать изменение ширины (прогресс ранга — да, статичный балл — нет) */
  animated?: boolean
}

/**
 * Полоса балла: трек + заполнение по значению в процентах.
 *
 * Вынесена из трёх мест с одинаковой разметкой (`dark-core-block`,
 * `experimental-scales-block`, `rank-badge`) — порог «три повторения» пройден.
 *
 * В `libs/ui` намеренно не вынесена: сама разметка тривиальна, а ценность
 * здесь в общем зажиме значения и единой геометрии внутри archetest. Другим
 * приложениям это не нужно, у Chakra для их случаев есть `Progress`.
 */
export function ScoreBar({
  value,
  color = 'gray.400',
  trackColor = 'bg.muted',
  height = '6px',
  animated = false,
  ...props
}: ScoreBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <Box position="relative" w="100%" h={height} bg={trackColor} borderRadius="full" overflow="hidden" {...props}>
      <Box
        position="absolute"
        left={0}
        top={0}
        h="100%"
        w={`${clamped}%`}
        bg={color}
        borderRadius="full"
        transition={animated ? 'width 0.5s ease' : undefined}
      />
    </Box>
  )
}
