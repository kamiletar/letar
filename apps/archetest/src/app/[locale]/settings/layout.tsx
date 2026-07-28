import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Настройки профиля — за авторизацией, в поиске им делать нечего.
 * Layout существует только ради `noindex`: сама страница клиентская
 * и объявить `metadata` в ней нельзя. См. пояснение в `cabinet/layout.tsx`.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children
}
