'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Input } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteReview, hideReview, publishReview } from '../_actions/manage-review'

interface ReviewActionsProps {
  reviewId: string
  status: string
}

/** Кнопки действий для модерации отзыва */
export function ReviewActions({ reviewId, status }: ReviewActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [hideReason, setHideReason] = useState('')
  const [showHideInput, setShowHideInput] = useState(false)

  const handleHide = () => {
    if (!showHideInput) {
      setShowHideInput(true)
      return
    }
    if (!hideReason.trim()) {
      toaster.error({ title: 'Укажите причину скрытия' })
      return
    }
    startTransition(async () => {
      const result = await hideReview(reviewId, hideReason)
      if (result.success) {
        toaster.success({ title: 'Отзыв скрыт' })
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  const handlePublish = () => {
    startTransition(async () => {
      const result = await publishReview(reviewId)
      if (result.success) {
        toaster.success({ title: 'Отзыв опубликован' })
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteReview(reviewId)
      if (result.success) {
        toaster.success({ title: 'Отзыв удалён' })
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  return (
    <HStack gap={2} flexWrap="wrap">
      {status === 'PUBLISHED' && (
        <>
          {showHideInput && (
            <Input
              size="sm"
              placeholder="Причина скрытия"
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              w="180px"
            />
          )}
          <Button size="sm" variant="outline" colorPalette="yellow" onClick={handleHide} loading={isPending}>
            Скрыть
          </Button>
        </>
      )}
      {status === 'HIDDEN' && (
        <Button size="sm" variant="outline" colorPalette="green" onClick={handlePublish} loading={isPending}>
          Опубликовать
        </Button>
      )}
      {status !== 'DELETED' && (
        <Button size="sm" variant="outline" colorPalette="red" onClick={handleDelete} loading={isPending}>
          Удалить
        </Button>
      )}
    </HStack>
  )
}
