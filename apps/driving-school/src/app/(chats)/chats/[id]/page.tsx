import { notFound, redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'
import { getChatAction, markChatAsReadAction } from '../_actions/chat.action'
import { ChatPageClient } from './_page-client'

interface ChatPageProps {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params

  const session = await getSession()
  if (!session?.user) {
    redirect('/sign-in')
  }

  const result = await getChatAction(id)

  if (!result.success) {
    if (result.error === 'NOT_FOUND' || result.error === 'FORBIDDEN') {
      notFound()
    }
    throw new Error(result.error)
  }

  // Отмечаем чат как прочитанный
  await markChatAsReadAction(id)

  return (
    <ChatPageClient
      chat={result.chat}
      currentUserId={session.user.id}
      currentUserName={session.user.name || 'Пользователь'}
    />
  )
}
