import type { Metadata } from 'next'
import type { ReactNode } from 'react'

/**
 * Кабинет психолога — за авторизацией. Общий layout нужен только ради
 * `noindex`: страницы сами клиентские (`'use client'`), а в клиентском
 * компоненте `metadata` объявить нельзя.
 *
 * Без этого раздел наследовал `index: true` из корневого layout и заявлял себя
 * в выдаче, хотя без сессии отдаёт пустой экран. В `robots.txt` он тоже закрыт —
 * это второй, независимый барьер: robots.txt запрещает обход, meta-noindex
 * запрещает попадание в индекс по внешним ссылкам.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CabinetLayout({ children }: { children: ReactNode }) {
  return children
}
