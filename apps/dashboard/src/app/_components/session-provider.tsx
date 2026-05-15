'use client'

import type { ReactNode } from 'react'

interface SessionProviderProps {
  children: ReactNode
}

/**
 * Session Provider для Better Auth
 *
 * Better Auth управляет сессиями через cookies напрямую,
 * поэтому этот компонент просто пропускает children.
 *
 * Оставлен для обратной совместимости с layout.tsx
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <>{children}</>
}
