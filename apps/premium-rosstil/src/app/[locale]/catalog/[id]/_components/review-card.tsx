import { StarRating } from '@/app/_components/star-rating'
import { Box, HStack, Image, Text, VStack } from '@chakra-ui/react'

interface ReviewCardProps {
  review: {
    id: string
    rating: number
    text: string | null
    images: string[]
    createdAt: string
    author: { name: string | null }
    response: string | null
    respondedAt: string | null
  }
}

/** Карточка отзыва */
export function ReviewCard({ review }: ReviewCardProps) {
  return (
    <Box borderWidth="1px" borderRadius="lg" p={4}>
      <VStack align="stretch" gap={3}>
        {/* Шапка: автор, звёзды, дата */}
        <HStack justify="space-between" flexWrap="wrap">
          <HStack gap={3}>
            <Text fontWeight="medium">{review.author.name || 'Покупатель'}</Text>
            <StarRating rating={review.rating} size="sm" />
          </HStack>
          <Text fontSize="sm" color="fg.muted">
            {new Date(review.createdAt).toLocaleDateString('ru-RU', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </HStack>

        {/* Текст отзыва */}
        {review.text && <Text>{review.text}</Text>}

        {/* Фото-галерея */}
        {review.images.length > 0 && (
          <HStack gap={2} flexWrap="wrap">
            {review.images.map((url, i) => (
              <Image
                key={i}
                src={url}
                alt={`Фото ${i + 1}`}
                boxSize="80px"
                objectFit="cover"
                borderRadius="md"
                cursor="pointer"
              />
            ))}
          </HStack>
        )}

        {/* Ответ продавца */}
        {review.response && (
          <Box bg="bg.subtle" borderRadius="md" p={3} ml={4}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Ответ продавца
            </Text>
            <Text fontSize="sm">{review.response}</Text>
            {review.respondedAt && (
              <Text fontSize="xs" color="fg.muted" mt={1}>
                {new Date(review.respondedAt).toLocaleDateString('ru-RU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            )}
          </Box>
        )}
      </VStack>
    </Box>
  )
}
