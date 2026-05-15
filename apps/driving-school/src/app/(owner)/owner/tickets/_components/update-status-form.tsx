'use client'

import { Button, HStack } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuCheck, LuClock, LuLoader, LuX } from 'react-icons/lu'

import type { TicketStatus } from '@letar/driving-school-db/prisma'

import { updateTicketStatusAction } from '../_actions/ticket.action'

interface UpdateStatusFormProps {
  ticketId: string
  currentStatus: TicketStatus
}

export function UpdateStatusForm({ ticketId, currentStatus }: UpdateStatusFormProps) {
  const [isOpenPending, startOpenTransition] = useTransition()
  const [isInProgressPending, startInProgressTransition] = useTransition()
  const [isResolvedPending, startResolvedTransition] = useTransition()
  const [isClosedPending, startClosedTransition] = useTransition()

  const handleStatusChange = (status: TicketStatus) => {
    const transition =
      status === 'OPEN'
        ? startOpenTransition
        : status === 'IN_PROGRESS'
          ? startInProgressTransition
          : status === 'RESOLVED'
            ? startResolvedTransition
            : startClosedTransition

    transition(async () => {
      await updateTicketStatusAction({ ticketId, status })
    })
  }

  return (
    <HStack gap={2} flexWrap="wrap">
      {/* Открыть */}
      {currentStatus !== 'OPEN' && (
        <Button
          colorPalette="blue"
          variant="outline"
          size="sm"
          loading={isOpenPending}
          onClick={() => handleStatusChange('OPEN')}
        >
          <LuLoader />
          Открыть
        </Button>
      )}

      {/* В работе */}
      {currentStatus !== 'IN_PROGRESS' && (
        <Button
          colorPalette="orange"
          variant="outline"
          size="sm"
          loading={isInProgressPending}
          onClick={() => handleStatusChange('IN_PROGRESS')}
        >
          <LuClock />В работе
        </Button>
      )}

      {/* Решён */}
      {currentStatus !== 'RESOLVED' && (
        <Button
          colorPalette="green"
          variant="outline"
          size="sm"
          loading={isResolvedPending}
          onClick={() => handleStatusChange('RESOLVED')}
        >
          <LuCheck />
          Решён
        </Button>
      )}

      {/* Закрыть */}
      {currentStatus !== 'CLOSED' && (
        <Button
          colorPalette="gray"
          variant="outline"
          size="sm"
          loading={isClosedPending}
          onClick={() => handleStatusChange('CLOSED')}
        >
          <LuX />
          Закрыть
        </Button>
      )}
    </HStack>
  )
}
