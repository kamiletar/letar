import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Layout для страницы закладок.
 * Страница не индексируется поисковиками (noindex).
 */
export const metadata: Metadata = {
  title: 'Закладки',
  description: 'Сохранённые статьи законодательства',
  robots: {
    index: false,
    follow: false,
  },
}

export default function BookmarksLayout({ children }: { children: ReactNode }) {
  return children
}
