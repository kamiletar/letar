/**
 * Общие типы аутентификации для Mandala.
 *
 * Единый источник правды для типов UserWithRole и SessionWithRole,
 * используемых как на сервере, так и на клиенте.
 */

import type { UserRole } from '@/generated/prisma'

/**
 * Расширенный тип пользователя с ролью.
 * Используется в auth.ts (сервер) и auth-client.ts (клиент).
 */
export interface UserWithRole {
  id: string
  /** Имя может быть null в БД (при регистрации без имени) */
  name: string | null
  email: string
  emailVerified: boolean
  image?: string | null
  createdAt: Date
  updatedAt: Date
  role: UserRole
}

/**
 * Расширенный тип сессии с данными пользователя.
 */
export interface SessionWithRole {
  session: {
    id: string
    userId: string
    token: string
    expiresAt: Date
    ipAddress?: string | null
    userAgent?: string | null
    createdAt: Date
    updatedAt: Date
  }
  user: UserWithRole
}
