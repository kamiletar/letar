'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { approveApplication, rejectApplication } from '../_actions/manage-application'

interface ApplicationActionsProps {
  applicationId: string
}

export function ApplicationActions({ applicationId }: ApplicationActionsProps) {
  const [isPending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  const handleApprove = () => {
    startTransition(async () => {
      const result = await approveApplication(applicationId)
      if (result.success) {
        toaster.success({ title: 'Заявка одобрена' })
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  const handleReject = () => {
    startTransition(async () => {
      const result = await rejectApplication(applicationId, reviewNote)
      if (result.success) {
        toaster.success({ title: 'Заявка отклонена' })
        setShowRejectForm(false)
      } else {
        toaster.error({ title: result.error || 'Ошибка' })
      }
    })
  }

  if (showRejectForm) {
    return (
      <VStack align="stretch" gap={2}>
        <Text fontSize="sm" fontWeight="medium">
          Причина отклонения:
        </Text>
        <Input
          size="sm"
          value={reviewNote}
          onChange={(e) => setReviewNote(e.target.value)}
          placeholder="Укажите причину..."
        />
        <HStack gap={2}>
          <Button size="sm" colorPalette="red" onClick={handleReject} loading={isPending}>
            Отклонить
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowRejectForm(false)} disabled={isPending}>
            Отмена
          </Button>
        </HStack>
      </VStack>
    )
  }

  return (
    <HStack gap={2}>
      <Button size="sm" colorPalette="green" onClick={handleApprove} loading={isPending}>
        Одобрить
      </Button>
      <Button
        size="sm"
        colorPalette="red"
        variant="outline"
        onClick={() => setShowRejectForm(true)}
        disabled={isPending}
      >
        Отклонить
      </Button>
    </HStack>
  )
}
