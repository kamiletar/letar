'use client'

import { Badge, HStack, Text } from '@chakra-ui/react'
import { LuStar } from 'react-icons/lu'

export interface RatingDisplayProps {
  /**
   * Средний рейтинг (1.0-5.0)
   */
  rating: number | null | undefined
  /**
   * Количество отзывов
   */
  reviewCount?: number
  /**
   * Размер
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Показывать только число и звезду (компактный вид)
   * @default false
   */
  compact?: boolean
  /**
   * Текст при отсутствии отзывов
   * @default 'Нет отзывов'
   */
  noReviewsText?: string
  /**
   * Функция для склонения слова "отзыв" (для локализации)
   * По умолчанию используется русское склонение
   */
  reviewWordFn?: (count: number) => string
}

const sizeMap = {
  sm: { star: 14, text: 'sm' as const },
  md: { star: 16, text: 'md' as const },
  lg: { star: 20, text: 'lg' as const },
}

/**
 * Склонение слова "отзыв" (русский язык)
 */
function defaultReviewWord(count: number): string {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100

  if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
    return 'отзывов'
  }
  if (lastDigit === 1) {
    return 'отзыв'
  }
  if (lastDigit >= 2 && lastDigit <= 4) {
    return 'отзыва'
  }
  return 'отзывов'
}

/**
 * Определяем цвет в зависимости от рейтинга
 */
function getColorPalette(rating: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (rating >= 4.5) {
    return 'green'
  }
  if (rating >= 3.5) {
    return 'yellow'
  }
  if (rating >= 2.5) {
    return 'orange'
  }
  return 'red'
}

/**
 * Компактное отображение рейтинга с цветовой индикацией
 *
 * @example
 * ```tsx
 * // Полный вид с количеством отзывов
 * <RatingDisplay rating={4.5} reviewCount={42} />
 *
 * // Компактный бейдж
 * <RatingDisplay rating={4.5} compact />
 *
 * // Кастомный текст при отсутствии отзывов
 * <RatingDisplay rating={null} noReviewsText="Пока нет оценок" />
 * ```
 */
export function RatingDisplay({
  rating,
  reviewCount = 0,
  size = 'md',
  compact = false,
  noReviewsText = 'Нет отзывов',
  reviewWordFn = defaultReviewWord,
}: RatingDisplayProps) {
  const { star, text } = sizeMap[size]

  // Если нет рейтинга
  if (!rating || rating === 0) {
    if (compact) {
      return null
    }
    return (
      <Text fontSize={text} color="fg.muted">
        {noReviewsText}
      </Text>
    )
  }

  const colorPalette = getColorPalette(rating)

  if (compact) {
    return (
      <Badge colorPalette={colorPalette} variant="subtle" display="flex" alignItems="center" gap={1}>
        <LuStar size={star} fill="currentColor" />
        {rating.toFixed(1)}
      </Badge>
    )
  }

  return (
    <HStack gap={2}>
      <HStack gap={1} color={`${colorPalette}.fg`}>
        <LuStar size={star} fill="currentColor" />
        <Text fontSize={text} fontWeight="semibold">
          {rating.toFixed(1)}
        </Text>
      </HStack>
      {reviewCount > 0 && (
        <Text fontSize={text} color="fg.muted">
          ({reviewCount} {reviewWordFn(reviewCount)})
        </Text>
      )}
    </HStack>
  )
}
