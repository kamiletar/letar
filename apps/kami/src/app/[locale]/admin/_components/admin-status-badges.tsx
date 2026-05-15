'use client'

import { Badge, HStack, Icon } from '@chakra-ui/react'
import { Eye, EyeOff, Star } from 'lucide-react'

/**
 * Props для PublishStatusBadge
 */
export interface PublishStatusBadgeProps {
  /** Опубликовано ли */
  isPublished: boolean
  /** Featured (избранное) */
  isFeatured?: boolean
}

/**
 * Бейдж статуса публикации (Опубликован/Черновик + Featured)
 */
export function PublishStatusBadge({ isPublished, isFeatured }: PublishStatusBadgeProps) {
  return (
    <HStack gap={2}>
      <Badge variant="subtle" colorPalette={isPublished ? 'green' : 'gray'}>
        <Icon boxSize={3}>{isPublished ? <Eye /> : <EyeOff />}</Icon>
        {isPublished ? 'Опубликован' : 'Черновик'}
      </Badge>
      {isFeatured && (
        <Badge variant="subtle" colorPalette="purple">
          <Icon boxSize={3}>
            <Star />
          </Icon>
          Featured
        </Badge>
      )}
    </HStack>
  )
}

/**
 * Props для RatingStars
 */
export interface RatingStarsProps {
  /** Рейтинг (1-5) */
  rating: number
  /** Максимальное количество звёзд */
  max?: number
}

/**
 * Отображение рейтинга звёздами
 */
export function RatingStars({ rating, max = 5 }: RatingStarsProps) {
  return (
    <HStack gap={0.5}>
      {Array.from({ length: max }).map((_, i) => (
        <Icon key={`star-${i}`} boxSize={4} color={i < rating ? 'yellow.400' : 'gray.300'}>
          <Star fill={i < rating ? 'currentColor' : 'none'} />
        </Icon>
      ))}
    </HStack>
  )
}
