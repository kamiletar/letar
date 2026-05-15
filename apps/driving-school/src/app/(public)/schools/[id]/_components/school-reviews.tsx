/**
 * Секция отзывов школы
 *
 * @module school-reviews
 */

import { Card, Heading, HStack, Stack } from '@chakra-ui/react'
import { RatingDisplay, ReviewCard } from '@letar/ui'

import type { ReviewWithAuthor } from './school-profile.types'

interface SchoolReviewsProps {
  reviews: ReviewWithAuthor[]
  averageRating: number | null
  reviewCount: number
}

/**
 * Список последних отзывов о школе
 */
export function SchoolReviews({ reviews, averageRating, reviewCount }: SchoolReviewsProps) {
  if (reviews.length === 0) {
    return null
  }

  return (
    <Card.Root>
      <Card.Header>
        <HStack justify="space-between">
          <Heading size="md">Отзывы</Heading>
          <RatingDisplay rating={averageRating} reviewCount={reviewCount} compact />
        </HStack>
      </Card.Header>
      <Card.Body pt={0}>
        <Stack gap={4}>
          {reviews.map((review: ReviewWithAuthor) => (
            <ReviewCard
              key={review.id}
              review={{
                id: review.id,
                authorId: review.authorId,
                author: review.author,
                targetType: 'school',
                rating: review.rating,
                text: review.text,
                status: review.status,
                createdAt: review.createdAt,
              }}
            />
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
