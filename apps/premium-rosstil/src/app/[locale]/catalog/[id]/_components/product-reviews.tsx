import { getEnhancedPrisma } from '@/lib/db'
import { Heading, Text, VStack } from '@chakra-ui/react'
import { ReviewCard } from './review-card'
import { ReviewSummary } from './review-summary'

interface ProductReviewsProps {
  productId: string
}

/** Блок отзывов на странице товара (Server Component) */
export async function ProductReviews({ productId }: ProductReviewsProps) {
  const db = getEnhancedPrisma()

  // Загрузка отзывов
  const reviews = await (db.review as any).findMany({
    where: { productId, status: 'PUBLISHED' },
    include: {
      author: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  if (!reviews || reviews.length === 0) {
    return null
  }

  // Подсчёт распределения по звёздам
  const distribution = [0, 0, 0, 0, 0] // 1-5 звёзд
  let totalRating = 0

  for (const review of reviews) {
    distribution[review.rating - 1]++
    totalRating += review.rating
  }

  const stats = {
    distribution,
    total: reviews.length,
    average: Math.round((totalRating / reviews.length) * 10) / 10,
  }

  // Сериализация дат для клиентских компонентов
  const serializedReviews = reviews.map(
    (r: {
      id: string
      rating: number
      text: string | null
      images: string[]
      createdAt: Date
      author: { name: string | null }
      response: string | null
      respondedAt: Date | null
    }) => ({
      id: r.id,
      rating: r.rating,
      text: r.text,
      images: r.images,
      createdAt: r.createdAt.toISOString(),
      author: r.author,
      response: r.response,
      respondedAt: r.respondedAt?.toISOString() ?? null,
    })
  )

  return (
    <VStack align="stretch" gap={6} mt={8}>
      <Heading size="lg" textTransform="none">
        Отзывы
      </Heading>

      <ReviewSummary stats={stats} />

      <VStack align="stretch" gap={4}>
        {serializedReviews.map(
          (review: {
            id: string
            rating: number
            text: string | null
            images: string[]
            createdAt: string
            author: { name: string | null }
            response: string | null
            respondedAt: string | null
          }) => (
            <ReviewCard key={review.id} review={review} />
          )
        )}
      </VStack>

      {reviews.length >= 20 && (
        <Text fontSize="sm" color="fg.muted" textAlign="center">
          Показаны последние 20 отзывов
        </Text>
      )}
    </VStack>
  )
}
