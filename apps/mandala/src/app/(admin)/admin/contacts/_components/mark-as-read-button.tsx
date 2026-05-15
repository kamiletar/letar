'use client'

import { Button } from '@chakra-ui/react'
import { useTransition } from 'react'
import { LuCheck } from 'react-icons/lu'
import { markAsReadAction } from '../_actions/mark-as-read.action'

interface MarkAsReadButtonProps {
  messageId: string
}

export function MarkAsReadButton({ messageId }: MarkAsReadButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      await markAsReadAction(messageId)
    })
  }

  return (
    <Button size="xs" variant="ghost" colorPalette="fg" onClick={handleClick} loading={isPending}>
      <LuCheck />
      Прочитано
    </Button>
  )
}
