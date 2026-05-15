'use client'

import type { ReactNode } from 'react'

/**
 * Props для SessionProvider
 */
export interface SessionProviderProps {
  children: ReactNode
}

/**
 * SessionProvider для Better Auth
 *
 * Better Auth управляет сессией через cookies автоматически,
 * поэтому этот провайдер просто пробрасывает children.
 *
 * Используется для совместимости с паттерном провайдеров
 * и может быть расширен при необходимости.
 *
 * @example
 * ```tsx
 * // В layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <SessionProvider>
 *       {children}
 *     </SessionProvider>
 *   )
 * }
 * ```
 */
export function SessionProvider({ children }: SessionProviderProps): ReactNode {
  return <>{children}</>
}
