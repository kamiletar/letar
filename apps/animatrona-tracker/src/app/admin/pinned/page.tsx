import type { Metadata } from 'next'

import { PinnedListClient } from './_components/pinned-list-client'

export const metadata: Metadata = {
  title: 'Запиненные аниме',
}

/**
 * Страница со списком всех запиненных аниме
 * Доступна по клику на статистику "Запинено" в админ-панели
 */
export default function PinnedPage() {
  return <PinnedListClient />
}
