'use client'

import { KamiForm } from '@/kami-form'
import { useSession } from '@/lib/auth-client'
import { Avatar, Box, Button, HStack, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { z } from 'zod/v4'
import { addCommentAction } from '../_actions/comments.action'

interface CommentFormProps {
  postSlug: string
  parentId?: string
  onSuccess?: () => void
  onCancel?: () => void
  placeholder?: string
}

const CommentSchema = z
  .object({
    content: z.string().min(3, 'Минимум 3 символа').max(2000, 'Максимум 2000 символов'),
  })
  .strip()

type CommentData = z.infer<typeof CommentSchema>

const defaultValues: CommentData = {
  content: '',
}

/**
 * Форма добавления комментария
 */
export function CommentForm({ postSlug, parentId, onSuccess, onCancel, placeholder }: CommentFormProps) {
  const { data: session } = useSession()
  const t = useTranslations('blog.comments')
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = useCallback(
    async (data: CommentData) => {
      setSubmitError(null)

      const result = await addCommentAction({
        postSlug,
        content: data.content,
        parentId,
      })

      if (result.success) {
        router.refresh()
        onSuccess?.()
      } else {
        setSubmitError(result.error === 'UNAUTHORIZED' ? t('loginRequired') : t('error'))
        throw new Error(result.error) // Прерываем submit, чтобы форма не сбросилась
      }
    },
    [postSlug, parentId, router, onSuccess, t]
  )

  if (!session?.user) {
    return null
  }

  return (
    <KamiForm<CommentData> initialValue={defaultValues} schema={CommentSchema} onSubmit={handleSubmit}>
      <HStack align="start" gap={3}>
        <Avatar.Root size="sm">
          <Avatar.Image src={session.user.image || undefined} alt={session.user.name || ''} />
          <Avatar.Fallback>{session.user.name?.[0] || 'U'}</Avatar.Fallback>
        </Avatar.Root>

        <VStack flex={1} gap={2} align="stretch">
          <KamiForm.Field.Textarea
            name="content"
            placeholder={placeholder || t('placeholder')}
            rows={3}
            resize="vertical"
          />

          {submitError && (
            <Box color="red.500" fontSize="sm">
              {submitError}
            </Box>
          )}

          <HStack justify="flex-end" gap={2}>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                {t('cancel')}
              </Button>
            )}
            <KamiForm.Button.Submit colorPalette="purple" size="sm">
              {parentId ? t('reply') : t('submit')}
            </KamiForm.Button.Submit>
          </HStack>
        </VStack>
      </HStack>
    </KamiForm>
  )
}
