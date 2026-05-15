'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuCheck, LuX } from 'react-icons/lu'

import type { TicketStatus } from '@letar/driving-school-db/prisma'
import { closeTicketAction, resolveTicketAction } from '../_actions/support.action'

interface TicketActionsProps {
  ticketId: string
  status: TicketStatus
  isAuthor: boolean
  isAdmin: boolean
}

export function TicketActions({ ticketId, status, isAuthor, isAdmin }: TicketActionsProps) {
  const [isClosing, startCloseTransition] = useTransition()
  const [isResolving, startResolveTransition] = useTransition()

  // Если тикет закрыт — ничего не показываем
  if (status === 'CLOSED') {
    return null
  }

  const handleResolve = () => {
    startResolveTransition(async () => {
      const result = await resolveTicketAction({ ticketId })
      if (result.success) {
        toaster.success({ title: 'Тикет отмечен как решённый' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  const handleClose = () => {
    startCloseTransition(async () => {
      const result = await closeTicketAction({ ticketId })
      if (result.success) {
        toaster.success({ title: 'Тикет закрыт' })
      } else {
        toaster.error({ title: result.error })
      }
    })
  }

  return (
    <HStack gap={2}>
      {/* Пометить как решённый (только для поддержки) */}
      {isAdmin && status !== 'RESOLVED' && (
        <Button colorPalette="green" variant="outline" size="sm" loading={isResolving} onClick={handleResolve}>
          <LuCheck />
          Решено
        </Button>
      )}

      {/* Закрыть тикет (автор или поддержка) */}
      {(isAuthor || isAdmin) && (
        <Button colorPalette="gray" variant="outline" size="sm" loading={isClosing} onClick={handleClose}>
          <LuX />
          Закрыть
        </Button>
      )}
    </HStack>
  )
}
