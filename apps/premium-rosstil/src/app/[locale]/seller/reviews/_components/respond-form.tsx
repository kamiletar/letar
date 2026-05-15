'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Textarea, VStack } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { respondToReview } from '../_actions/respond-review'

interface RespondFormProps {
  reviewId: string
}

/** Inline-форма ответа продавца на отзыв */
export function RespondForm({ reviewId }: RespondFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [response, setResponse] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <Button size="sm" variant="outline" colorPalette="fg" onClick={() => setIsOpen(true)}>
        Ответить
      </Button>
    )
  }

  const handleSubmit = () => {
    if (!response.trim()) {
      toaster.error({ title: 'Введите ответ' })
      return
    }

    startTransition(async () => {
      const result = await respondToReview({ reviewId, response })
      if (result.success) {
        toaster.success({ title: 'Ответ отправлен' })
        setIsOpen(false)
        router.refresh()
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  return (
    <VStack align="stretch" gap={2}>
      <Textarea
        value={response}
        onChange={(e) => setResponse(e.target.value)}
        placeholder="Ваш ответ на отзыв..."
        rows={3}
        maxLength={1000}
        size="sm"
      />
      <HStack gap={2} justify="flex-end">
        <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)} disabled={isPending}>
          Отмена
        </Button>
        <Button size="sm" colorPalette="fg" onClick={handleSubmit} loading={isPending} disabled={!response.trim()}>
          Отправить
        </Button>
      </HStack>
    </VStack>
  )
}
