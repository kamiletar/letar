'use client'

import { TouchLink } from '@letar/ui'

interface HomeLinkProps {
  /** Колбэк при клике (для закрытия мобильного меню) */
  onClick?: () => void
}

/**
 * Ссылка на главную страницу.
 * Используется в sidebar и mobile-sidebar.
 */
export function HomeLink({ onClick }: HomeLinkProps) {
  return (
    <TouchLink
      href="/"
      mb={6}
      display="flex"
      fontSize="sm"
      color="fg.muted"
      _hover={{ color: 'brand.600' }}
      onClick={onClick}
    >
      ← На главную
    </TouchLink>
  )
}
