import { getSession } from '@/lib/auth'

import { BottomNav } from './bottom-nav'

/**
 * Серверный wrapper для BottomNav.
 * Получает сессию и передаёт роли в клиентский компонент.
 */
export async function BottomNavWrapper() {
  const session = await getSession()

  // Не показываем навигацию для неавторизованных и незавершивших onboarding
  if (!session?.user || !session.user.isOnboardingComplete) {
    return null
  }

  const roles = session.user.roles || []

  return <BottomNav roles={roles} />
}
