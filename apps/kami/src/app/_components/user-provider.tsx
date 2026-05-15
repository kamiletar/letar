'use client'

import type { UserRole } from '@/generated/prisma'
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

const UserContext = createContext<UserContextValue>({
  id: null,
  name: null,
  email: null,
  image: null,
  roles: [],
  isAuthenticated: false,
  isAdmin: false,
})

interface UserProviderProps {
  /** Серверные данные пользователя */
  value: UserContextValue
  children: ReactNode
}

/**
 * Провайдер контекста пользователя.
 *
 * Получает данные из серверного layout (getSession + isAdmin),
 * раздаёт через React Context без лишних запросов к БД.
 *
 * @example
 * // layout.tsx (серверный)
 * <UserProvider value={{ id, name, email, image, roles, isAuthenticated, isAdmin }}>
 *   {children}
 * </UserProvider>
 *
 * // Любой клиентский компонент
 * const { isAdmin, isAuthenticated } = useUser()
 */
export function UserProvider({ value, children }: UserProviderProps) {
  return <UserContext value={value}>{children}</UserContext>
}

/**
 * Хук для получения данных пользователя из контекста.
 *
 * Работает без запросов к БД — данные приходят из серверного layout.
 */
export function useUser(): UserContextValue {
  return use(UserContext)
}
