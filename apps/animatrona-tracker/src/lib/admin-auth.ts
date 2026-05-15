/**
 * Хелперы авторизации для admin API роутов.
 *
 * Централизуют проверку сессии + роли, возвращая либо
 * { session, db } для дальнейшей работы, либо NextResponse с ошибкой.
 */

import { NextResponse } from 'next/server'

import { getSession } from './auth'
import type { SessionWithRole } from './auth.types'
import { getEnhancedPrisma } from './db'

type AdminAuthSuccess = {
  session: SessionWithRole
  db: ReturnType<typeof getEnhancedPrisma>
}

type AdminAuthResult = AdminAuthSuccess | NextResponse

/**
 * Проверить, что пользователь авторизован и имеет роль MODERATOR или ADMIN.
 * Возвращает { session, db } или NextResponse с ошибкой (401/403).
 *
 * @example
 * ```ts
 * const auth = await requireModeratorOrAdmin()
 * if (auth instanceof NextResponse) return auth
 * const { session, db } = auth
 * ```
 */
export async function requireModeratorOrAdmin(): Promise<AdminAuthResult> {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }
  if (session.user.role !== 'MODERATOR' && session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Недостаточно прав' }, { status: 403 })
  }
  return { session, db: getEnhancedPrisma(session.user) }
}

/**
 * Проверить, что пользователь авторизован и имеет роль ADMIN.
 * Возвращает { session, db } или NextResponse с ошибкой (401/403).
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const session = await getSession()
  if (!session?.user) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Только для администраторов' }, { status: 403 })
  }
  return { session, db: getEnhancedPrisma(session.user) }
}

/** Type guard: результат — ошибка авторизации */
export function isAuthError(result: AdminAuthResult): result is NextResponse {
  return result instanceof NextResponse
}
