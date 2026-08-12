import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Профиль — за авторизацией, в поиске делать нечего.
 * Layout существует только ради `noindex`: сама страница клиентская
 * и объявить `metadata` в ней нельзя.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function ProfileLayout({ children }: { children: ReactNode }) {
  return children
}
