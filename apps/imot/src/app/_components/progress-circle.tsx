'use client'

import { Box, Text } from '@chakra-ui/react'

export interface ProgressCircleProps {
  /**
   * Значение прогресса (0-100)
   */
  value: number

  /**
   * Размер круга в пикселях
   */
  size?: number

  /**
   * Цвет прогресса
   */
  color?: string

  /**
   * Толщина круга
   */
  strokeWidth?: number

  /**
   * Показывать ли процент внутри круга
   */
  showPercentage?: boolean

  /**
   * Метка внутри круга (вместо процента)
   */
  label?: string
}

/**
 * Круговой прогресс-бар для отображения прогресса по уровням
 */
export function ProgressCircle({
  value,
  size = 120,
  color = '#667eea',
  strokeWidth = 8,
  showPercentage = true,
  label,
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (value / 100) * circumference

  return (
    <Box position="relative" width={`${size}px`} height={`${size}px`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Фоновый круг */}
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e0e0e0" strokeWidth={strokeWidth} fill="none" />

        {/* Прогресс */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.5s ease',
          }}
        />
      </svg>

      {/* Текст внутри круга */}
      <Box position="absolute" top="50%" left="50%" transform="translate(-50%, -50%)" textAlign="center">
        {label ? (
          <Text fontSize="sm" fontWeight="medium" color="gray.700">
            {label}
          </Text>
        ) : showPercentage ? (
          <>
            <Text fontSize="2xl" fontWeight="bold" color={color}>
              {Math.round(value)}
            </Text>
            <Text fontSize="xs" color="gray.500">
              %
            </Text>
          </>
        ) : null}
      </Box>
    </Box>
  )
}
