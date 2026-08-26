'use client'

/**
 * Секция комментариев к аниме.
 *
 * Загружает комментарии через API с cursor-пагинацией.
 * Авторизованные пользователи могут оставлять комментарии и отвечать.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Skeleton, Text, Textarea, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { LuLogIn, LuMessageCircle, LuSend } from 'react-icons/lu'

import { CommentCard, type CommentData } from './comment-card'

interface CommentsSectionProps {
  animeId: string
  isAuthenticated: boolean
  currentUserId?: string
  currentUserRole?: string
}

export function CommentsSection({ animeId, isAuthenticated, currentUserId, currentUserRole }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentData[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  /** Загрузить комментарии */
  const fetchComments = useCallback(
    async (cursor?: string) => {
      const isLoadMore = !!cursor
      if (isLoadMore) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }

      try {
        const url = new URL('/api/comments', window.location.origin)
        url.searchParams.set('animeId', animeId)
        if (cursor) {
          url.searchParams.set('cursor', cursor)
        }

        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          if (isLoadMore) {
            setComments((prev) => [...prev, ...json.data])
          } else {
            setComments(json.data)
          }
          setNextCursor(json.nextCursor)
        }
      } catch {
        toaster.error({ title: 'Ошибка загрузки комментариев' })
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [animeId],
  )

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  /** Отправить новый комментарий */
  const handleSubmit = async () => {
    if (!newComment.trim()) {
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId, text: newComment.trim() }),
      })
      if (res.ok) {
        const json = await res.json()
        setComments((prev) => [json.data, ...prev])
        setNewComment('')
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка отправки' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setSubmitting(false)
    }
  }

  /** Перезагрузить список после ответа */
  const handleReplyCreated = () => {
    fetchComments()
  }

  return (
    <VStack align="stretch" gap={6}>
      {/* Форма нового комментария */}
      {isAuthenticated
        ? (
          <VStack align="stretch" gap={3}>
            <Textarea
              placeholder="Напишите комментарий..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              maxLength={2000}
            />
            <Box>
              <Button
                colorPalette="brand"
                size="sm"
                onClick={handleSubmit}
                loading={submitting}
                disabled={!newComment.trim()}
              >
                <LuSend />
                Отправить
              </Button>
            </Box>
          </VStack>
        )
        : (
          <Box p={4} bg="bg.subtle" borderRadius="lg" textAlign="center">
            <Text color="fg.muted" mb={3}>
              <LuMessageCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Войдите, чтобы оставить комментарий
            </Text>
            <Button asChild size="sm" colorPalette="brand" variant="outline">
              <NextLink href="/sign-in">
                <LuLogIn />
                Войти
              </NextLink>
            </Button>
          </Box>
        )}

      {/* Список комментариев */}
      {loading
        ? (
          <VStack align="stretch" gap={4}>
            {[1, 2, 3].map((i) => (
              <Box key={i}>
                <Skeleton height="16px" width="120px" mb={2} />
                <Skeleton height="40px" />
              </Box>
            ))}
          </VStack>
        )
        : comments.length === 0
        ? (
          <Box textAlign="center" py={8}>
            <LuMessageCircle
              size={32}
              color="var(--chakra-colors-fg-muted)"
              style={{ marginBottom: '12px' }}
            />
            <Text color="fg.muted">Комментариев пока нет. Будьте первым!</Text>
          </Box>
        )
        : (
          <VStack align="stretch" gap={4} divideY="1px" divideColor="border.subtle">
            {comments.map((comment) => (
              <Box key={comment.id} pt={4} _first={{ pt: 0 }}>
                <CommentCard
                  comment={comment}
                  currentUserId={currentUserId}
                  currentUserRole={currentUserRole}
                  animeId={animeId}
                  onReplyCreated={handleReplyCreated}
                />
              </Box>
            ))}
          </VStack>
        )}

      {/* Кнопка "Показать ещё" */}
      {nextCursor && (
        <Box textAlign="center">
          <Button variant="outline" size="sm" onClick={() => fetchComments(nextCursor)} loading={loadingMore}>
            Показать ещё
          </Button>
        </Box>
      )}
    </VStack>
  )
}
