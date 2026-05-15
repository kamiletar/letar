'use client'

import { getOrCreatePrivateChatAction } from '@/app/(chats)/chats/_actions/chat.action'
import { Button } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { LuMessageSquare } from 'react-icons/lu'

interface ChatButtonProps {
  instructorUserId: string
}

export function ChatButton({ instructorUserId }: ChatButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    startTransition(async () => {
      const result = await getOrCreatePrivateChatAction(instructorUserId)
      if (result.success) {
        router.push(`/chats/${result.chatId}`)
      } else {
        router.push('/chats')
      }
    })
  }

  return (
    <Button size="sm" variant="ghost" onClick={handleClick} loading={isPending}>
      <LuMessageSquare size={14} />
    </Button>
  )
}
