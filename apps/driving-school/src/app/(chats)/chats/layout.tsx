import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'
import { getChatsAction } from './_actions/chat.action'
import { ChatsLayoutClient } from './_layout-client'

export default async function ChatsLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in/')
  }

  const result = await getChatsAction()
  const chats = result.success ? result.chats : []

  // Проверяем, является ли пользователь менеджером хотя бы одной школы
  const isManagerOfAnySchool = session.user.roles?.some((r: string) => r === 'OWNER' || r === 'MODERATOR') ?? false

  return (
    <ChatsLayoutClient
      chats={chats}
      userRoles={session.user.roles}
      hasStudentProfile={session.user.hasStudentProfile ?? false}
      hasInstructorProfile={session.user.hasInstructorProfile ?? false}
      isManagerOfAnySchool={isManagerOfAnySchool}
      currentUserId={session.user.id}
    >
      {children}
    </ChatsLayoutClient>
  )
}
