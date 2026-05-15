'use client'

import { Avatar, Badge, Box, Button, Card, HStack, Text, Textarea, VStack } from '@chakra-ui/react'
import { formatDistanceToNow, type Locale } from 'date-fns'
import { ru } from 'date-fns/locale'
import { useState, useTransition } from 'react'
import { LuFlag, LuMessageSquare, LuSend, LuX } from 'react-icons/lu'

import { RatingStars } from './rating-stars'

export interface ReviewAuthor {
  id: string
  name: string | null
  image?: string | null
}

export interface ReviewData {
  id: string
  authorId: string
  author: ReviewAuthor
  /**
   * Тип объекта отзыва (для отображения в ответе)
   * Например: 'instructor', 'school', 'product'
   */
  targetType: string
  rating: number
  text?: string | null
  /**
   * Статус отзыва
   * @example 'VISIBLE', 'HIDDEN', 'PENDING'
   */
  status: string
  response?: string | null
  respondedAt?: Date | null
  createdAt: Date
}

export interface ReviewCardProps {
  /**
   * Данные отзыва
   */
  review: ReviewData
  /**
   * ID текущего пользователя (для определения авторства)
   */
  currentUserId?: string
  /**
   * Может ли текущий пользователь отвечать на отзыв
   * @default false
   */
  canRespond?: boolean
  /**
   * Callback для ответа на отзыв
   */
  onRespond?: (reviewId: string, response: string) => Promise<void>
  /**
   * Callback для жалобы на отзыв
   */
  onReport?: (reviewId: string) => void
  /**
   * Статус, при котором отзыв считается скрытым
   * @default 'HIDDEN'
   */
  hiddenStatus?: string
  /**
   * Текст бейджа для скрытого отзыва
   * @default 'Отзыв скрыт модератором'
   */
  hiddenBadgeText?: string
  /**
   * Функция для получения названия респондента по типу объекта
   * @default возвращает 'инструктора' для 'INSTRUCTOR', 'школы' для остальных
   */
  getResponderLabel?: (targetType: string) => string
  /**
   * Locale для форматирования дат (date-fns)
   * @default ru
   */
  dateLocale?: Locale
}

/**
 * Функция по умолчанию для получения названия респондента
 */
function defaultGetResponderLabel(targetType: string): string {
  if (targetType === 'INSTRUCTOR' || targetType === 'instructor') {
    return 'инструктора'
  }
  return 'школы'
}

/**
 * Универсальная карточка отзыва с возможностью ответа
 *
 * @example
 * ```tsx
 * <ReviewCard
 *   review={review}
 *   currentUserId={user?.id}
 *   canRespond={isOwner}
 *   onRespond={handleRespond}
 *   onReport={handleReport}
 * />
 * ```
 */
export function ReviewCard({
  review,
  currentUserId,
  canRespond = false,
  onRespond,
  onReport,
  hiddenStatus = 'HIDDEN',
  hiddenBadgeText = 'Отзыв скрыт модератором',
  getResponderLabel = defaultGetResponderLabel,
  dateLocale = ru,
}: ReviewCardProps) {
  const [isPending, startTransition] = useTransition()
  const [showResponseForm, setShowResponseForm] = useState(false)
  const [responseText, setResponseText] = useState('')

  const isAuthor = currentUserId === review.authorId
  const timeAgo = formatDistanceToNow(new Date(review.createdAt), { addSuffix: true, locale: dateLocale })

  const handleSubmitResponse = () => {
    if (!responseText.trim() || !onRespond) {
      return
    }
    startTransition(async () => {
      await onRespond(review.id, responseText.trim())
      setResponseText('')
      setShowResponseForm(false)
    })
  }

  return (
    <Card.Root>
      <Card.Body>
        <VStack align="stretch" gap={4}>
          {/* Заголовок с автором и рейтингом */}
          <HStack justify="space-between" align="start">
            <HStack gap={3}>
              <Avatar.Root size="sm">
                {review.author.image && <Avatar.Image src={review.author.image} />}
                <Avatar.Fallback>{review.author.name?.charAt(0) || '?'}</Avatar.Fallback>
              </Avatar.Root>
              <Box>
                <Text fontWeight="medium">{review.author.name || 'Без имени'}</Text>
                <Text fontSize="sm" color="fg.muted">
                  {timeAgo}
                </Text>
              </Box>
            </HStack>
            <RatingStars value={review.rating} size="sm" />
          </HStack>

          {/* Текст отзыва */}
          {review.text && <Text color="fg">{review.text}</Text>}

          {/* Статус (если скрыт) */}
          {review.status === hiddenStatus && (
            <Badge colorPalette="red" variant="subtle">
              {hiddenBadgeText}
            </Badge>
          )}

          {/* Ответ на отзыв */}
          {review.response && (
            <Box bg="bg.subtle" p={4} borderRadius="md" borderLeftWidth={3} borderLeftColor="fg.solid">
              <Text fontSize="sm" fontWeight="medium" color="fg.muted" mb={2}>
                Ответ {getResponderLabel(review.targetType)}
              </Text>
              <Text>{review.response}</Text>
              {review.respondedAt && (
                <Text fontSize="xs" color="fg.muted" mt={2}>
                  {formatDistanceToNow(new Date(review.respondedAt), { addSuffix: true, locale: dateLocale })}
                </Text>
              )}
            </Box>
          )}

          {/* Форма ответа */}
          {showResponseForm && (
            <Box>
              <Textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                placeholder="Напишите ответ на отзыв..."
                rows={3}
                maxLength={500}
              />
              <HStack justify="flex-end" mt={2}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowResponseForm(false)
                    setResponseText('')
                  }}
                  disabled={isPending}
                >
                  <LuX />
                  Отмена
                </Button>
                <Button
                  colorPalette="brand"
                  size="sm"
                  onClick={handleSubmitResponse}
                  disabled={!responseText.trim() || isPending}
                  loading={isPending}
                >
                  <LuSend />
                  Отправить
                </Button>
              </HStack>
            </Box>
          )}

          {/* Действия */}
          <HStack gap={2}>
            {canRespond && !review.response && !showResponseForm && (
              <Button variant="ghost" size="sm" onClick={() => setShowResponseForm(true)}>
                <LuMessageSquare />
                Ответить
              </Button>
            )}
            {!isAuthor && onReport && (
              <Button variant="ghost" size="sm" colorPalette="red" onClick={() => onReport(review.id)}>
                <LuFlag />
                Пожаловаться
              </Button>
            )}
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
