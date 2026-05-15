'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'

/**
 * Хук для отслеживания количества pending мутаций
 *
 * Используется для показа индикатора синхронизации
 * когда есть мутации, ожидающие отправки на сервер.
 * Основан на useSyncExternalStore для оптимальной производительности.
 *
 * @returns number — количество pending мутаций
 *
 * @example
 * ```tsx
 * const pendingCount = usePendingMutations()
 *
 * if (pendingCount > 0) {
 *   return <SyncIndicator count={pendingCount} />
 * }
 * ```
 */
export function usePendingMutations(): number {
  const queryClient = useQueryClient()

  const subscribe = (callback: () => void) => {
    return queryClient.getMutationCache().subscribe(callback)
  }

  const getSnapshot = () => {
    return queryClient
      .getMutationCache()
      .getAll()
      .filter((m) => m.state.status === 'pending').length
  }

  return useSyncExternalStore(subscribe, getSnapshot, () => 0)
}
