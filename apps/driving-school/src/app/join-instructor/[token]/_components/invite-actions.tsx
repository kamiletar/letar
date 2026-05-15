'use client'

import {
  acceptInvitation,
  type AcceptInvitationResult,
  declineInvitation,
  type DeclineInvitationResult,
} from '@/app/(instructor)/students/invite/_actions/invite.action'
import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

interface InviteActionsProps {
  token: string
}

export function InviteActions({ token }: InviteActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState('')

  const handleAccept = async () => {
    setErrorMessage('')

    startTransition(async () => {
      const result: AcceptInvitationResult = await acceptInvitation(token)

      if (!result.success) {
        switch (result.error) {
          case 'UNAUTHORIZED':
            setErrorMessage('Необходимо войти в систему')
            break
          case 'NOT_STUDENT':
            setErrorMessage('Приглашения могут принимать только ученики')
            break
          case 'NOT_FOUND':
            setErrorMessage('Приглашение не найдено')
            break
          case 'EXPIRED':
            setErrorMessage('Приглашение истекло')
            break
          case 'ALREADY_ACCEPTED':
            setErrorMessage('Приглашение уже принято')
            break
          default:
            setErrorMessage('Произошла ошибка')
        }
        return
      }

      toaster.success({
        title: 'Приглашение принято',
        description: 'Вы теперь связаны с инструктором',
      })

      router.push('/dashboard')
    })
  }

  const handleDecline = async () => {
    setErrorMessage('')

    startTransition(async () => {
      const result: DeclineInvitationResult = await declineInvitation(token)

      if (!result.success) {
        switch (result.error) {
          case 'NOT_FOUND':
            setErrorMessage('Приглашение не найдено')
            break
          case 'EXPIRED':
            setErrorMessage('Приглашение истекло')
            break
          case 'ALREADY_PROCESSED':
            setErrorMessage('Приглашение уже обработано')
            break
          default:
            setErrorMessage('Произошла ошибка')
        }
        return
      }

      toaster.success({
        title: 'Приглашение отклонено',
      })

      router.refresh()
    })
  }

  return (
    <Box>
      {errorMessage && (
        <Box layerStyle="panel.error" p={3} mb={4}>
          <Text color="error.fg" fontSize="sm">
            {errorMessage}
          </Text>
        </Box>
      )}

      <HStack gap={3}>
        <Button onClick={handleAccept} colorPalette="brand" loading={isPending} flex={1} size="lg">
          Принять приглашение
        </Button>
        <Button onClick={handleDecline} variant="outline" loading={isPending} flex={1} size="lg">
          Отклонить
        </Button>
      </HStack>
    </Box>
  )
}
