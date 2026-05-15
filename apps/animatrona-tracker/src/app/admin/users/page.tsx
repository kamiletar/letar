import type { Metadata } from 'next'

import { UsersListClient } from './_components/users-list-client'

export const metadata: Metadata = {
  title: 'Пользователи',
}

/**
 * Страница со списком пользователей
 * Доступна по клику на статистику "Пользователей" в админ-панели
 */
export default function UsersPage() {
  return <UsersListClient />
}
