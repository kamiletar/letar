'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Avatar, Button, HStack, Icon, Text, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuCornerDownRight, LuPencil, LuReply, LuTrash2, LuX } from 'react-icons/lu'

interface CommentAuthor {
  id: string
  name: string | null
  image: string | null
}

export interface CommentData {
  id: string
  text: string
  author: CommentAuthor
  authorId: string
  parentId: string | null
  createdAt: string
  updatedAt: string
  replies?: CommentData[]
}

interface CommentCardProps {
  comment: CommentData
  currentUserId?: string
  currentUserRole?: string
  animeId: string
  /** Это ответ (вложенный комментарий) */
  isReply?: boolean
  onReplyCreated?: () => void
}

/** Форматирует дату в относительный формат */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMin < 1) {
    return 'только что'
  }
  if (diffMin < 60) {
    return `${diffMin} мин. назад`
  }
  if (diffHours < 24) {
    return `${diffHours} ч. назад`
  }
  if (diffDays < 7) {
    return `${diffDays} дн. назад`
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function CommentCard({
  comment,
  currentUserId,
  currentUserRole,
  animeId,
  isReply,
  onReplyCreated,
}: CommentCardProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [isReplying, setIsReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)

  const isOwner = currentUserId === comment.authorId
  const canDelete = isOwner || currentUserRole === 'ADMIN' || currentUserRole === 'MODERATOR'
  const isEdited = comment.updatedAt !== comment.createdAt

  /** Сохранить редактирование */
  const handleSaveEdit = async () => {
    if (!editText.trim()) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editText.trim() }),
      })
      if (res.ok) {
        setIsEditing(false)
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка редактирования' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  /** Удалить комментарий */
  const handleDelete = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/comments/${comment.id}`, { method: 'DELETE' })
      if (res.ok) {
        toaster.success({ title: 'Комментарий удалён' })
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка удаления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  /** Отправить ответ */
  const handleReply = async () => {
    if (!replyText.trim()) {
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animeId, text: replyText.trim(), parentId: comment.id }),
      })
      if (res.ok) {
        setReplyText('')
        setIsReplying(false)
        onReplyCreated?.()
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        toaster.error({ title: data.error || 'Ошибка отправки' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <VStack align="stretch" gap={0}>
      <HStack align="start" gap={3} pl={isReply ? 8 : 0}>
        {isReply && <Icon as={LuCornerDownRight} color="fg.muted" mt={1} flexShrink={0} />}
        <Avatar.Root size="sm" flexShrink={0}>
          {comment.author.image && <Avatar.Image src={comment.author.image} />}
          <Avatar.Fallback>{(comment.author.name || '?')[0]}</Avatar.Fallback>
        </Avatar.Root>

        <VStack align="stretch" flex={1} gap={1}>
          {/* Заголовок: имя + время */}
          <HStack gap={2}>
            <Text fontWeight="semibold" fontSize="sm">
              {comment.author.name || 'Аноним'}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {formatRelativeTime(comment.createdAt)}
            </Text>
            {isEdited && (
              <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                (ред.)
              </Text>
            )}
          </HStack>

          {/* Текст или форма редактирования */}
          {isEditing ? (
            <VStack align="stretch" gap={2}>
              <Textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={2000}
                autoFocus
              />
              <HStack>
                <Button size="xs" colorPalette="brand" onClick={handleSaveEdit} loading={loading}>
                  Сохранить
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false)
                    setEditText(comment.text)
                  }}
                >
                  Отмена
                </Button>
              </HStack>
            </VStack>
          ) : (
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {comment.text}
            </Text>
          )}

          {/* Кнопки действий */}
          {!isEditing && (
            <HStack gap={1} mt={1}>
              {/* Ответить (только для top-level, только авторизованным) */}
              {!isReply && currentUserId && (
                <Button size="xs" variant="ghost" color="fg.muted" onClick={() => setIsReplying(!isReplying)}>
                  <Icon as={isReplying ? LuX : LuReply} />
                  {isReplying ? 'Отмена' : 'Ответить'}
                </Button>
              )}
              {/* Редактировать (только автор) */}
              {isOwner && (
                <Button size="xs" variant="ghost" color="fg.muted" onClick={() => setIsEditing(true)}>
                  <Icon as={LuPencil} />
                  Изменить
                </Button>
              )}
              {/* Удалить (автор / модератор / админ) */}
              {canDelete && (
                <Button size="xs" variant="ghost" color="fg.muted" onClick={handleDelete} loading={loading}>
                  <Icon as={LuTrash2} />
                  Удалить
                </Button>
              )}
            </HStack>
          )}

          {/* Форма ответа */}
          {isReplying && (
            <VStack align="stretch" gap={2} mt={2}>
              <Textarea
                placeholder="Ваш ответ..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                maxLength={2000}
                autoFocus
              />
              <HStack>
                <Button
                  size="xs"
                  colorPalette="brand"
                  onClick={handleReply}
                  loading={loading}
                  disabled={!replyText.trim()}
                >
                  Отправить
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setIsReplying(false)
                    setReplyText('')
                  }}
                >
                  Отмена
                </Button>
              </HStack>
            </VStack>
          )}
        </VStack>
      </HStack>

      {/* Вложенные ответы */}
      {!isReply && comment.replies && comment.replies.length > 0 && (
        <VStack align="stretch" gap={3} mt={3}>
          {comment.replies.map((reply) => (
            <CommentCard
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              animeId={animeId}
              isReply
            />
          ))}
        </VStack>
      )}
    </VStack>
  )
}
