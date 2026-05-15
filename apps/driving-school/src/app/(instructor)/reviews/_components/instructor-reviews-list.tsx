'use client'

import { VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useOptimistic, useTransition } from 'react'

import type { ReviewWithAuthor } from '@/app/(student)/my-reviews/_actions/review.action'
import { respondToReviewAction } from '@/app/(student)/my-reviews/_actions/review.action'
import { toaster } from '@/app/_components/ui/toaster'
import { ReviewCard } from '@letar/ui'

interface InstructorReviewsListProps {
  reviews: ReviewWithAuthor[]
  instructorUserId: string
}

type OptimisticUpdate = {
  reviewId: string
  response: string
}

export function InstructorReviewsList({ reviews, instructorUserId }: InstructorReviewsListProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  // Оптимистичное обновление списка отзывов
  const [optimisticReviews, setOptimisticReviews] = useOptimistic(
    reviews,
    (state, { reviewId, response }: OptimisticUpdate) => {
      return state.map((review) =>
        review.id === reviewId
          ? {
              ...review,
              response,
              respondedAt: new Date(),
            }
          : review
      )
    }
  )

  const handleRespond = async (reviewId: string, response: string) => {
    startTransition(async () => {
      // Мгновенное добавление ответа к отзыву
      setOptimisticReviews({ reviewId, response })

      const result = await respondToReviewAction({ reviewId, response })

      if (result.success) {
        toaster.success({ title: 'Ответ отправлен' })
        router.refresh()
      } else {
        toaster.error({ title: result.error })
        router.refresh() // Вернёт реальное значение
      }
    })
  }

  return (
    <VStack gap={4} align="stretch">
      {optimisticReviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          currentUserId={instructorUserId}
          canRespond={!review.response}
          onRespond={handleRespond}
        />
      ))}
    </VStack>
  )
}
