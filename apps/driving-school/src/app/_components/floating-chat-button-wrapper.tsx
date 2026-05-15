import { getSession } from '@/lib/auth'

import { FloatingChatButton } from './floating-chat-button'

/**
 * Серверный wrapper для FloatingChatButton.
 * Показывает кнопку чатов только для авторизованных пользователей.
 */
export async function FloatingChatButtonWrapper() {
  const session = await getSession()

  // Не показываем кнопку чатов для неавторизованных и незавершивших onboarding
  if (!session?.user || !session.user.isOnboardingComplete) {
    return null
  }

  return <FloatingChatButton />
}
