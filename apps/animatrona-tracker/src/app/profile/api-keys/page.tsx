import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getApiKeys } from './_actions/api-key.action'
import { ApiKeysClient } from './_components/api-keys-client'

/**
 * Страница управления API ключами
 */
export default async function ApiKeysPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/sign-in')
  }

  const keys = await getApiKeys()

  return <ApiKeysClient keys={keys} />
}

export const metadata = {
  title: 'API Ключи — Профиль',
  description: 'Управление API ключами для публикации из Animatrona',
}
