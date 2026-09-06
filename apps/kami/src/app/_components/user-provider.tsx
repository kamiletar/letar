'use client'

import type { UserRole } from '@/generated/prisma'
import { useSession } from '@/lib/auth-client'
import { createContext, type ReactNode, use } from 'react'

/** Данные пользователя, доступные через контекст */
export interface UserContextValue {
  /** ID пользователя (null = не авторизован) */
  id: string | null
  /** Имя пользователя */
  name: string | null
  /** Email */
  email: string | null
  /** URL аватара */
  image: string | null
  /** Роли из БД */
  roles: UserRole[]
  /** Авторизован ли пользователь */
  isAuthenticated: boolean
  /** Является ли пользователь админом */
  isAdmin: boolean
}

const EMPTY_USER: UserContextValue = {
  id: null,
  name: null,
  email: null,
  image: null,
  roles: [],
  isAuthenticated: false,
  isAdmin: false,
}

const UserContext = createContext<UserContextValue>(EMPTY_USER)

interface UserProviderProps {
  children: ReactNode
}

/**
 * Провайдер контекста пользователя.
 *
 * Данные берутся из клиентского `useSession()` (тот же Better Auth cookie-cache/fetch, которым
 * уже пользуется `AuthButton`) — НЕ из серверного layout. Раньше сюда прилетал результат
 * `getSession()`+`isAdmin()` из корневого `layout.tsx`, но это `await headers()` внутри —
 * Dynamic API, форсирующее динамический рендеринг для ВСЕГО дерева `[locale]/*`, и при этом
 * ничего в приложении фактически не читало `useUser()` кроме неиспользуемого `OnlyFor`
 * (`AuthButton` уже независимо дублировал ту же логику через клиентский `useSession()`).
 * Перенос сюда убирает Dynamic API из layout и возвращает страницам возможность SSG —
 * см. «Техдолг: setRequestLocale не даёт SSG» в PLAN.md.
 *
 * Компромисс: на первом клиентском рендере, пока `useSession()` не резолвилась, контекст
 * отдаёт `isAuthenticated: false`/`isAdmin: false` — короткая вспышка «гостя» до гидратации
 * cookie-cache. Не влияет на реальную защиту `/admin/*` — та всегда проверяется отдельно на
 * сервере (`requireAdmin()`/`isAdmin()` в каждой admin-странице), контекст даёт только UI-хинты.
 *
 * @example
 * const { isAdmin, isAuthenticated } = useUser()
 */
export function UserProvider({ children }: UserProviderProps) {
  const { data: session } = useSession()
  const user = session?.user

  const value: UserContextValue = user
    ? {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image ?? null,
      roles: Array.isArray(user.roles) ? user.roles : [],
      isAuthenticated: true,
      isAdmin: Array.isArray(user.roles) && user.roles.includes('ADMIN'),
    }
    : EMPTY_USER

  return <UserContext value={value}>{children}</UserContext>
}

/**
 * Хук для получения данных пользователя из контекста.
 *
 * Клиентский `useSession()` под капотом — короткая вспышка «гостя» до резолва сессии,
 * см. `UserProvider`.
 */
export function useUser(): UserContextValue {
  return use(UserContext)
}
