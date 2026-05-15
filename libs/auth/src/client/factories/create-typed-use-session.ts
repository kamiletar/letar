'use client'

import type { AuthClient, AuthClientWithOAuth } from '../create-auth-client'

/**
 * Результат useSession с типизированной сессией
 */
export interface TypedSessionResult<TSession> {
  /** Данные сессии (типизированные) */
  data: TSession | null
  /** Загрузка сессии */
  isPending: boolean
  /** Ошибка загрузки */
  error: Error | null
  /** Перезагрузить сессию */
  refetch: () => void
}

/**
 * Создаёт типизированный хук useSession
 *
 * @example
 * ```typescript
 * // apps/my-app/src/lib/auth-client.ts
 * import { createAuthClientWithOAuth, createTypedUseSession } from '@letar/auth/client'
 * import type { UserRole } from '@/generated/prisma'
 *
 * export const authClient = createAuthClientWithOAuth()
 *
 * interface SessionWithRole {
 *   session: {
 *     id: string
 *     userId: string
 *     token: string
 *     expiresAt: Date
 *     // ...
 *   }
 *   user: {
 *     id: string
 *     name: string
 *     email: string
 *     role: UserRole
 *   }
 * }
 *
 * export const useSession = createTypedUseSession<SessionWithRole>(authClient)
 *
 * // Использование в компоненте
 * function MyComponent() {
 *   const { data: session, isPending } = useSession()
 *   // TypeScript знает тип session!
 *   if (session?.user.role === 'ADMIN') { ... }
 * }
 * ```
 */
export function createTypedUseSession<TSession>(authClient: AuthClient | AuthClientWithOAuth) {
  return function useSession(): TypedSessionResult<TSession> {
    const result = authClient.useSession()
    return {
      ...result,
      data: result.data as TSession | null,
    }
  }
}
