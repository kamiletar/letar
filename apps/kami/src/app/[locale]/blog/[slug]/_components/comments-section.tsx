'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { useSession } from '@/lib/auth-client'
import { Avatar, Box, Button, Card, Heading, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { MessageSquare, Reply, Trash } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useState, useTransition } from 'react'
import { deleteCommentAction } from '../_actions/comments.action'
import { CommentForm } from './comment-form'

interface CommentUser {
  id: string
  name: string | null
  image: string | null
}

interface Comment {
  id: string
  content: string
  createdAt: Date
  user: CommentUser | null
  guestName: string | null
  replies?: Comment[]
}

interface CommentsSectionProps {
  postSlug: string
  comments: Comment[]
  locale: string
}

/**
 * Секция комментариев
 */
export function CommentsSection({ postSlug, comments, locale }: CommentsSectionProps) {
  const t = useTranslations('blog.comments')
  const { data: session } = useSession()

  return (
    <VStack gap={6} align="stretch">
      <HStack gap={2}>
        <Icon boxSize={5}>
          <MessageSquare />
        </Icon>
        <Heading size="lg">
          {t('title')} ({comments.length})
        </Heading>
      </HStack>

      {/* Форма добавления комментария */}
      {session?.user
        ? (
          <Card.Root>
            <Card.Body>
              <CommentForm postSlug={postSlug} />
            </Card.Body>
          </Card.Root>
        )
        : (
          <Card.Root>
            <Card.Body>
              <Text color="fg.muted">
                {t('loginToComment')}{' '}
                <Link href={`/${locale}/auth/signin`}>
                  <Text as="span" color="fg" fontWeight="medium">
                    {t('signIn')}
                  </Text>
                </Link>
              </Text>
            </Card.Body>
          </Card.Root>
        )}

      {/* Список комментариев */}
      {comments.length === 0
        ? (
          <Text color="fg.muted" textAlign="center" py={8}>
            {t('noComments')}
          </Text>
        )
        : (
          <VStack gap={4} align="stretch">
            {comments.map((comment) => (
              <CommentCard key={comment.id} comment={comment} postSlug={postSlug} locale={locale} />
            ))}
          </VStack>
        )}
    </VStack>
  )
}

interface CommentCardProps {
  comment: Comment
  postSlug: string
  locale: string
  isReply?: boolean
}

/**
 * Карточка комментария
 */
const CommentCard = memo(function CommentCard({ comment, postSlug, locale, isReply = false }: CommentCardProps) {
  const t = useTranslations('blog.comments')
  const { data: session } = useSession()
  const router = useRouter()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const authorName = comment.user?.name || comment.guestName || 'Аноним'
  const authorImage = comment.user?.image || undefined
  const isAuthor = session?.user?.id === comment.user?.id
  const isAdmin = session?.user?.roles?.includes('ADMIN')
  const canDelete = isAuthor || isAdmin

  const handleDelete = async () => {
    if (!(await confirm({ title: t('confirmDelete') }))) {
      return
    }

    startTransition(async () => {
      const result = await deleteCommentAction(comment.id)
      if (result.success) {
        router.refresh()
      }
    })
  }

  return (
    <>
      <ConfirmDialog />
      <Card.Root ml={isReply ? 8 : 0} variant={isReply ? 'subtle' : undefined}>
        <Card.Body>
          <VStack gap={3} align="stretch">
            <HStack justify="space-between">
              <HStack gap={2}>
                <Avatar.Root size="sm">
                  <Avatar.Image src={authorImage} alt={authorName} />
                  <Avatar.Fallback>{authorName[0]}</Avatar.Fallback>
                </Avatar.Root>
                <VStack gap={0} align="start">
                  <Text fontWeight="medium" fontSize="sm">
                    {authorName}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {new Date(comment.createdAt).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </VStack>
              </HStack>

              <HStack gap={1}>
                {!isReply && session?.user && (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setShowReplyForm(!showReplyForm)}
                  >
                    <Icon boxSize={4}>
                      <Reply />
                    </Icon>
                    {t('reply')}
                  </Button>
                )}
                {canDelete && (
                  <Button variant="ghost" size="xs" colorPalette="red" onClick={handleDelete} loading={isPending}>
                    <Icon boxSize={4}>
                      <Trash />
                    </Icon>
                  </Button>
                )}
              </HStack>
            </HStack>

            <Text whiteSpace="pre-wrap">{comment.content}</Text>

            {/* Форма ответа */}
            {showReplyForm && (
              <Box mt={2}>
                <CommentForm
                  postSlug={postSlug}
                  parentId={comment.id}
                  placeholder={t('replyPlaceholder', { name: authorName })}
                  onSuccess={() => setShowReplyForm(false)}
                  onCancel={() => setShowReplyForm(false)}
                />
              </Box>
            )}

            {/* Ответы */}
            {comment.replies && comment.replies.length > 0 && (
              <VStack gap={2} align="stretch" mt={2}>
                {comment.replies.map((reply) => (
                  <CommentCard key={reply.id} comment={reply} postSlug={postSlug} locale={locale} isReply />
                ))}
              </VStack>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </>
  )
})
