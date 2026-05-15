/**
 * Индикатор жестов — показывает визуальный feedback при double-tap
 *
 * Используется только для skip-forward и skip-backward (double-tap перемотка)
 */

import { Box, Text } from '@chakra-ui/react'
import { LuRotateCcw, LuRotateCw } from 'react-icons/lu'

/** Типы жестов (только skip) */
export type GestureType = 'skip-forward' | 'skip-backward'

interface GestureIndicatorProps {
  /** Тип жеста */
  type: GestureType
  /** Значение (секунды для skip) */
  value: number
  /** Позиция на экране (left или right) */
  position?: 'left' | 'right' | 'center'
}

export function GestureIndicator({ type, value, position = 'center' }: GestureIndicatorProps) {
  const Icon = type === 'skip-forward' ? LuRotateCw : LuRotateCcw

  // Позиция контейнера
  const getPositionStyles = () => {
    switch (position) {
      case 'left':
        return { left: '25%', transform: 'translateX(-50%) translateY(-50%)' }
      case 'right':
        return { right: '25%', transform: 'translateX(50%) translateY(-50%)' }
      default:
        return { left: '50%', transform: 'translateX(-50%) translateY(-50%)' }
    }
  }

  // Форматирование значения
  const formattedValue = type === 'skip-forward' ? `+${value} сек` : `−${Math.abs(value)} сек`

  return (
    <Box
      position="absolute"
      top="50%"
      zIndex={100}
      pointerEvents="none"
      style={{
        ...getPositionStyles(),
        animation: 'fadeInScale 0.15s ease-out',
      }}
    >
      {/* CSS анимации через style tag */}
      <style>
        {`
          @keyframes fadeInScale {
            0% { opacity: 0; transform: scale(0.8) translateX(-50%) translateY(-50%); }
            100% { opacity: 1; transform: scale(1) translateX(-50%) translateY(-50%); }
          }
        `}
      </style>

      {/* Основной контейнер */}
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        gap={1}
        p={4}
        borderRadius="xl"
        bg="black/60"
        backdropFilter="blur(8px)"
      >
        <Icon size={32} color="white" />
        <Text color="white" fontWeight="bold" fontSize="lg">
          {formattedValue}
        </Text>
      </Box>
    </Box>
  )
}
