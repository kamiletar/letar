import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Layout для страницы поиска.
 * Страница не индексируется поисковиками (noindex).
 */
export const metadata: Metadata = {
  title: 'Поиск',
  description: 'Поиск по законодательству Руси',
  robots: {
    index: false,
    follow: false,
  },
}

export default function SearchLayout({ children }: { children: ReactNode }) {
  return children
}
