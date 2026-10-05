import { redirect } from 'next/navigation'
import { getCurrentUser } from './auth'

/**
 * Приложение личное: заходить может только владелец.
 * Ключница пускает любого своего пользователя, поэтому почту сверяем сами.
 */
export function isOwnerEmail(email: string | null | undefined): boolean {
  const owner = process.env.OWNER_EMAIL?.trim().toLowerCase()
  return Boolean(owner && email && email.trim().toLowerCase() === owner)
}

/** Возвращает владельца или отправляет на страницу входа */
export async function requireOwner() {
  const user = await getCurrentUser()
  if (!user || !isOwnerEmail(user.email)) {
    redirect('/login')
  }
  return user
}
