'use client'

import { createReview } from '@/app/[locale]/profile/orders/_actions/create-review'
import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Card, HStack, Icon, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { FaRegStar, FaStar } from 'react-icons/fa'

interface ReviewFormProps {
  orderNumber: string
  products: Array<{ productId: string; productName: string }>
}

const RATING_LABELS: Record<number, string> = {
  1: 'Ужасно',
  2: 'Плохо',
  3: 'Нормально',
  4: 'Хорошо',
  5: 'Отлично',
}

/** Интерактивный селектор звёзд (доступен с клавиатуры) */
function StarSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)

  return (
    <HStack gap={1} role="radiogroup" aria-label="Оценка">
      {[1, 2, 3, 4, 5].map((star) => (
        <Box
          key={star}
          cursor="pointer"
          role="radio"
          tabIndex={0}
          aria-checked={value === star}
          aria-label={`${star} ${star === 1 ? 'звезда' : star < 5 ? 'звезды' : 'звёзд'} — ${RATING_LABELS[star]}`}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onChange(star)
            } else if (e.key === 'ArrowRight' && star < 5) {
              onChange(star + 1)
            } else if (e.key === 'ArrowLeft' && star > 1) {
              onChange(star - 1)
            }
          }}
          _focusVisible={{
            outline: '2px solid',
            outlineColor: 'fg',
            outlineOffset: '2px',
            borderRadius: 'sm',
          }}
        >
          <Icon
            as={star <= (hover || value) ? FaStar : FaRegStar}
            boxSize={6}
            color={star <= (hover || value) ? 'yellow.400' : 'gray.300'}
            transition="color 0.15s"
          />
        </Box>
      ))}
      {value > 0 && (
        <Text fontSize="sm" color="fg.muted" ml={2}>
          {RATING_LABELS[value]}
        </Text>
      )}
    </HStack>
  )
}

export function ReviewForm({ orderNumber, products }: ReviewFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Состояние для каждого товара
  const [reviews, setReviews] = useState<Record<string, { rating: number; text: string }>>(
    Object.fromEntries(products.map((p) => [p.productId, { rating: 0, text: '' }]))
  )

  const updateReview = (productId: string, field: 'rating' | 'text', value: number | string) => {
    setReviews((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }))
  }

  const handleSubmit = (productId: string) => {
    const review = reviews[productId]
    if (!review.rating) {
      toaster.error({ title: 'Укажите рейтинг' })
      return
    }

    startTransition(async () => {
      const result = await createReview({
        productId,
        rating: review.rating,
        text: review.text || undefined,
        images: [],
      })

      if (result.success) {
        toaster.success({ title: 'Отзыв опубликован' })
        router.push(`/profile/orders/${orderNumber}`)
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  return (
    <VStack gap={6} align="stretch">
      {products.map((product) => (
        <Card.Root key={product.productId}>
          <Card.Header>
            <Text fontWeight="bold">{product.productName}</Text>
          </Card.Header>
          <Card.Body>
            <VStack align="stretch" gap={4}>
              {/* Рейтинг */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Оценка{' '}
                  <Text as="span" color="red.500">
                    *
                  </Text>
                </Text>
                <StarSelector
                  value={reviews[product.productId]?.rating ?? 0}
                  onChange={(v) => updateReview(product.productId, 'rating', v)}
                />
              </Box>

              {/* Текст отзыва */}
              <Box>
                <Text fontSize="sm" fontWeight="medium" mb={2}>
                  Комментарий
                </Text>
                <Textarea
                  value={reviews[product.productId]?.text ?? ''}
                  onChange={(e) => updateReview(product.productId, 'text', e.target.value)}
                  placeholder="Расскажите о товаре..."
                  rows={4}
                  maxLength={2000}
                />
              </Box>

              {/* Кнопки */}
              <HStack justify="flex-end">
                <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
                  Отмена
                </Button>
                <Button
                  colorPalette="fg"
                  onClick={() => handleSubmit(product.productId)}
                  loading={isPending}
                  disabled={!reviews[product.productId]?.rating}
                >
                  Отправить отзыв
                </Button>
              </HStack>
            </VStack>
          </Card.Body>
        </Card.Root>
      ))}
    </VStack>
  )
}
