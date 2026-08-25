import { headers } from 'next/headers'

/**
 * Тип инстанса Better Auth с минимальным API анонимного плагина (`better-auth/plugins` → `anonymous()`)
 */
export type AnonymousAuthInstance = {
  api: {
    getSession: (opts: { headers: Headers }) => Promise<{ user: { id: string } } | null>
    signInAnonymous: (opts: {
      headers: Headers
      asResponse?: false
    }) => Promise<{ user: { id: string } } | null>
  }
}

/**
 * Создаёт хелпер, возвращающий id текущего пользователя — реального или анонимного
 * (создаёт гостевую сессию через Better Auth `signInAnonymous`, если сессии нет вовсе).
 * Для действий, которые должны работать и у гостя (корзина, избранное) — в отличие от
 * `createAuthGuards().requireAuth()`, гостя не редиректит.
 *
 * @example
 * ```typescript
 * import { createGetOrCreateSessionUserId } from '@letar/auth/server'
 * import { auth } from './auth'
 *
 * export const getOrCreateSessionUserId = createGetOrCreateSessionUserId(auth)
 * ```
 */
export function createGetOrCreateSessionUserId(auth: AnonymousAuthInstance) {
  return async function getOrCreateSessionUserId(): Promise<string> {
    const reqHeaders = await headers()
    const session = await auth.api.getSession({ headers: reqHeaders })
    if (session?.user) {
      return session.user.id
    }

    const result = await auth.api.signInAnonymous({ headers: reqHeaders, asResponse: false })
    if (!result?.user) {
      throw new Error('Не удалось создать гостевую сессию')
    }
    return result.user.id
  }
}
