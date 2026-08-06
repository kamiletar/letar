'use client'

import { type InvalidateQueryFilters, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

/**
 * Хук для инвалидации queries
 *
 * Предоставляет удобный API для инвалидации кэша TanStack Query.
 * Возвращает мемоизированную функцию для использования в callbacks.
 *
 * @returns Объект с методами инвалидации
 *
 * @example
 * ```tsx
 * const { invalidate, invalidateAll } = useInvalidateQueries()
 *
 * // Инвалидировать конкретный query
 * await invalidate(['products', productId])
 *
 * // Инвалидировать все queries начинающиеся с 'products'
 * await invalidate(['products'], { exact: false })
 *
 * // Инвалидировать все queries
 * await invalidateAll()
 * ```
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient()

  /**
   * Инвалидировать queries по ключу
   */
  const invalidate = useCallback(
    async (queryKey: unknown[], options?: Omit<InvalidateQueryFilters, 'queryKey'>) => {
      await queryClient.invalidateQueries({
        queryKey,
        ...options,
      })
    },
    [queryClient],
  )

  /**
   * Инвалидировать все queries
   */
  const invalidateAll = useCallback(async () => {
    await queryClient.invalidateQueries()
  }, [queryClient])

  /**
   * Инвалидировать и сразу refetch
   */
  const invalidateAndRefetch = useCallback(
    async (queryKey: unknown[]) => {
      await queryClient.invalidateQueries({
        queryKey,
        refetchType: 'active',
      })
    },
    [queryClient],
  )

  /**
   * Сбросить query к initial state
   */
  const reset = useCallback(
    async (queryKey: unknown[]) => {
      await queryClient.resetQueries({ queryKey })
    },
    [queryClient],
  )

  return {
    invalidate,
    invalidateAll,
    invalidateAndRefetch,
    reset,
  }
}
