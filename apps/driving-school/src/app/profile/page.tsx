import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'

export const metadata = {
  title: 'Профиль',
  description: 'Настройки профиля',
}

/**
 * Страница профиля - перенаправляет на общие настройки аккаунта
 */
export default async function ProfilePage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  // Все пользователи идут на общую страницу настроек
  redirect('/settings')
}
