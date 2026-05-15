import { StarRating } from '@/app/_components/star-rating'
import { Box, HStack, Text, VStack } from '@chakra-ui/react'

interface RatingDistribution {
  /** Количество отзывов по каждой звезде (индекс 0 = 1 звезда, ... 4 = 5 звёзд) */
  distribution: number[]
  total: number
  average: number
}

interface ReviewSummaryProps {
  stats: RatingDistribution
}

/** Сводка по рейтингу: средний балл + распределение по звёздам */
export function ReviewSummary({ stats }: ReviewSummaryProps) {
  if (stats.total === 0) {
    return null
  }

  return (
    <HStack gap={8} align="start" flexWrap="wrap">
      {/* Средний рейтинг */}
      <VStack gap={1}>
        <Text fontSize="4xl" fontWeight="bold" lineHeight={1}>
          {stats.average.toFixed(1)}
        </Text>
        <StarRating rating={stats.average} size="md" />
        <Text fontSize="sm" color="fg.muted">
          {stats.total} {pluralReviews(stats.total)}
        </Text>
      </VStack>

      {/* Распределение по звёздам */}
      <VStack gap={1} flex={1} minW="200px">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution[star - 1] || 0
          const pct = stats.total > 0 ? (count / stats.total) * 100 : 0
          return (
            <HStack key={star} gap={2} w="full">
              <Text fontSize="sm" w="12px" textAlign="right">
                {star}
              </Text>
              <Box flex={1} bg="bg.muted" borderRadius="full" h="8px">
                <Box bg="yellow.400" borderRadius="full" h="full" w={`${pct}%`} transition="width 0.3s" />
              </Box>
              <Text fontSize="sm" color="fg.muted" w="30px" textAlign="right">
                {count}
              </Text>
            </HStack>
          )
        })}
      </VStack>
    </HStack>
  )
}

/** Склонение слова "отзыв" */
function pluralReviews(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) {
    return 'отзыв'
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return 'отзыва'
  }
  return 'отзывов'
}
