'use client'

import type { SessionWithRole } from '@/lib/auth'
import { createContext, type ReactNode, useContext } from 'react'

/**
 * Контекст сессии для клиентских компонентов
 */
const SessionContext = createContext<SessionWithRole | null>(null)

/**
 * Провайдер сессии для Better Auth
 *
 * Передаёт серверную сессию в клиентские компоненты через React Context.
 * Для клиентского обновления сессии используйте useSession из auth-client.ts
 */
export function SessionProvider({ children, session }: { children: ReactNode; session: SessionWithRole | null }) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>
}

/**
 * Хук для доступа к сессии в клиентских компонентах
 *
 * @example
 * const session = useSessionContext()
 * if (session?.user) {
 *   console.log(session.user.email)
 * }
 */
export function useSessionContext() {
  return useContext(SessionContext)
}
