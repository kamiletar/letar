import { getSession } from '@/lib/auth'
import { UserMenuClient } from './user-menu-client'

/**
 * Server Component обертка для UserMenuClient.
 * Получает данные пользователя через auth() и передает в Client Component.
 * Благодаря этому данные всегда актуальные при каждом render на сервере.
 */
export async function UserMenu() {
  const session = await getSession()

  if (!session?.user) {
    return null
  }

  return (
    <UserMenuClient
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }}
    />
  )
}
