/**
 * Секция отзывов об инструкторе
 *
 * @module instructor-reviews
 */

import { Card, Heading, HStack, Stack } from '@chakra-ui/react'
import { RatingDisplay, ReviewCard } from '@letar/ui'

import type { InstructorWithRelations } from './instructor-profile.types'

interface InstructorReviewsProps {
  reviews: InstructorWithRelations['reviews']
  averageRating: number | null
  reviewCount: number
}

/**
 * Список последних отзывов об инструкторе
 */
export function InstructorReviews({ reviews, averageRating, reviewCount }: InstructorReviewsProps) {
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
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={{
                ...review,
                author: review.author,
              }}
            />
          ))}
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}
