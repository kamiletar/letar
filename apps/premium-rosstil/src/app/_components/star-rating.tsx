'use client'

import { HStack, Icon, Text } from '@chakra-ui/react'
import { FaRegStar, FaStar, FaStarHalfAlt } from 'react-icons/fa'

interface StarRatingProps {
  /** Рейтинг (1-5, допускается дробное) */
  rating: number
  /** Количество отзывов (опционально) */
  count?: number
  /** Размер звёзд */
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 3,
  md: 4,
  lg: 5,
}

/** Отображение рейтинга звёздами (readonly) */
export function StarRating({ rating, count, size = 'md' }: StarRatingProps) {
  const iconSize = sizeMap[size]
  const stars = []

  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push(<Icon key={i} as={FaStar} boxSize={iconSize} color="yellow.400" />)
    } else if (rating >= i - 0.5) {
      stars.push(<Icon key={i} as={FaStarHalfAlt} boxSize={iconSize} color="yellow.400" />)
    } else {
      stars.push(<Icon key={i} as={FaRegStar} boxSize={iconSize} color="yellow.400" />)
    }
  }

  return (
    <HStack gap={0.5}>
      {stars}
      {count !== undefined && (
        <Text fontSize={size} color="fg.muted" ml={1}>
          ({count})
        </Text>
      )}
    </HStack>
  )
}
