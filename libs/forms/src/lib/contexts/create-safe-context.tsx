'use client'

import { type Context, createContext, type Provider, useContext } from 'react'

/**
 * Результат создания безопасного контекста.
 * Содержит контекст, провайдер и два хука для доступа.
 */
export interface SafeContextResult<T> {
  /** React Context объект */
  Context: Context<T | null>
  /** Provider компонент */
  Provider: Provider<T | null>
  /**
   * Хук для обязательного доступа к контексту.
   * Выбрасывает ошибку, если используется вне Provider.
   */
  useContext: () => T
  /**
   * Хук для опционального доступа к контексту.
   * Возвращает null, если используется вне Provider.
   */
  useContextOptional: () => T | null
}

/**
 * Создаёт типобезопасный React Context с хуками для доступа.
 *
 * Устраняет boilerplate код при создании контекстов:
 * - Автоматически создаёт Context с дефолтным значением null
 * - Создаёт обязательный хук с понятным сообщением об ошибке
 * - Создаёт опциональный хук для случаев, когда контекст может отсутствовать
 *
 * @param contextName - Имя контекста для сообщений об ошибках
 *
 * @example
 * // Создание контекста
 * interface UserContextValue {
 *   name: string
 *   email: string
 * }
 *
 * export const {
 *   Context: UserContext,
 *   Provider: UserProvider,
 *   useContext: useUser,
 *   useContextOptional: useUserOptional,
 * } = createSafeContext<UserContextValue>('User')
 *
 * // Использование
 * function UserProfile() {
 *   const user = useUser() // Выбросит ошибку, если вне Provider
 *   return <div>{user.name}</div>
 * }
 *
 * function OptionalUserDisplay() {
 *   const user = useUserOptional() // Вернёт null, если вне Provider
 *   if (!user) return null
 *   return <div>{user.name}</div>
 * }
 */
export function createSafeContext<T>(contextName: string): SafeContextResult<T> {
  const Context = createContext<T | null>(null)
  Context.displayName = contextName

  function useSafeContext(): T {
    const value = useContext(Context)
    if (value === null) {
      throw new Error(`use${contextName} должен использоваться внутри ${contextName}Provider`)
    }
    return value
  }

  function useSafeContextOptional(): T | null {
    return useContext(Context)
  }

  return {
    Context,
    Provider: Context.Provider,
    useContext: useSafeContext,
    useContextOptional: useSafeContextOptional,
  }
}

/**
 * Создаёт контекст для именованных групп (с fullPath).
 * Используется для Form.Group, Form.Field и подобных компонентов.
 */
export interface NamedGroupContextValue {
  /** Полный путь к группе (например: "user.address" или "items.0") */
  fullPath: string
}

/**
 * Создаёт контекст для компонентов с именованными группами.
 * Специализированная версия createSafeContext для групповых контекстов.
 *
 * @param contextName - Имя контекста
 *
 * @example
 * const {
 *   Context: FormGroupContext,
 *   useContext: useFormGroup,
 * } = createNamedGroupContext('FormGroup')
 */
export function createNamedGroupContext(contextName: string): SafeContextResult<NamedGroupContextValue> {
  return createSafeContext<NamedGroupContextValue>(contextName)
}
