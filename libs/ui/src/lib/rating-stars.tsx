'use client'

import { Box, HStack } from '@chakra-ui/react'
import { useState } from 'react'
import { LuStar } from 'react-icons/lu'

export interface RatingStarsProps {
  /**
   * Значение рейтинга (1-5)
   * @default 0
   */
  value?: number
  /**
   * Callback при изменении (если не передан - только отображение)
   */
  onChange?: (value: number) => void
  /**
   * Размер звёзд
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Отключить интерактивность
   * @default false
   */
  disabled?: boolean
  /**
   * Показывать числовое значение рядом
   * @default false
   */
  showValue?: boolean
  /**
   * Цвет активных звёзд (CSS color)
   * @default '#CA9E67'
   */
  activeColor?: string
  /**
   * Цвет неактивных звёзд (CSS color)
   * @default '#CBD5E0'
   */
  inactiveColor?: string
}

const sizeMap = {
  sm: 16,
  md: 20,
  lg: 24,
}

/**
 * Компонент рейтинга звёздами
 *
 * @example
 * ```tsx
 * // Только отображение
 * <RatingStars value={4} />
 *
 * // Интерактивный выбор
 * <RatingStars value={rating} onChange={setRating} />
 *
 * // С числовым значением
 * <RatingStars value={4.5} showValue />
 *
 * // Кастомные цвета
 * <RatingStars value={3} activeColor="#FFD700" />
 * ```
 */
export function RatingStars({
  value = 0,
  onChange,
  size = 'md',
  disabled = false,
  showValue = false,
  activeColor = '#CA9E67',
  inactiveColor = '#CBD5E0',
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0)
  const isInteractive = !!onChange && !disabled
  const displayValue = hoverValue || value
  const starSize = sizeMap[size]

  return (
    <HStack gap={1}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Box
          key={star}
          onClick={() => {
            if (isInteractive) {
              onChange(star)
            }
          }}
          onMouseEnter={() => {
            if (isInteractive) {
              setHoverValue(star)
            }
          }}
          onMouseLeave={() => {
            if (isInteractive) {
              setHoverValue(0)
            }
          }}
          cursor={isInteractive ? 'pointer' : 'default'}
          transition="transform 0.1s"
          _hover={
            isInteractive
              ? {
                  transform: 'scale(1.1)',
                }
              : {}
          }
          aria-label={`${star} звёзд`}
          role={isInteractive ? 'button' : undefined}
          tabIndex={isInteractive ? 0 : undefined}
        >
          <LuStar
            size={starSize}
            fill={star <= displayValue ? activeColor : 'transparent'}
            color={star <= displayValue ? activeColor : inactiveColor}
            strokeWidth={1.5}
          />
        </Box>
      ))}
      {showValue && value > 0 && (
        <Box fontSize={size} fontWeight="medium" color="fg.muted" ml={1}>
          {value.toFixed(1)}
        </Box>
      )}
    </HStack>
  )
}
