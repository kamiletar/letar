'use client'

import { Button, HStack } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuUserPlus, LuUserX } from 'react-icons/lu'

import { assignTicketAction } from '../_actions/ticket.action'

interface AssignTicketFormProps {
  ticketId: string
  currentAssignedToId?: string
  currentUserId: string
}

export function AssignTicketForm({ ticketId, currentAssignedToId, currentUserId }: AssignTicketFormProps) {
  const [isAssignMePending, startAssignMeTransition] = useTransition()
  const [isUnassignPending, startUnassignTransition] = useTransition()

  const isAssignedToMe = currentAssignedToId === currentUserId

  const handleAssignMe = () => {
    startAssignMeTransition(async () => {
      await assignTicketAction({ ticketId, assignedToId: currentUserId })
    })
  }

  const handleUnassign = () => {
    startUnassignTransition(async () => {
      await assignTicketAction({ ticketId, assignedToId: undefined })
    })
  }

  return (
    <HStack gap={2}>
      {/* Назначить себе */}
      {!isAssignedToMe && (
        <Button colorPalette="blue" variant="outline" size="sm" loading={isAssignMePending} onClick={handleAssignMe}>
          <LuUserPlus />
          Назначить себе
        </Button>
      )}

      {/* Снять назначение */}
      {currentAssignedToId && (
        <Button colorPalette="gray" variant="outline" size="sm" loading={isUnassignPending} onClick={handleUnassign}>
          <LuUserX />
          Снять назначение
        </Button>
      )}
    </HStack>
  )
}
