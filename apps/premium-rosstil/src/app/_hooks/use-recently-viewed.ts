'use client'

import { useLocalStorage } from '@letar/hooks'
import { useCallback, useMemo } from 'react'

const STORAGE_KEY = 'premium-rosstil:recently-viewed'
const MAX_ITEMS = 20

interface ViewEntry {
  productId: string
  viewedAt: number
}

/**
 * Хук для управления историей просмотренных товаров.
 * Использует localStorage с LRU-стратегией (макс. 20 записей).
 */
export function useRecentlyViewed() {
  const [entries, setEntries, removeEntries] = useLocalStorage<ViewEntry[]>(STORAGE_KEY, [])

  /** Добавить просмотр товара (LRU: дубль перемещается наверх, обрезка до 20) */
  const addView = useCallback(
    (productId: string) => {
      setEntries((prev: ViewEntry[]) => {
        const filtered = prev.filter((e: ViewEntry) => e.productId !== productId)
        return [{ productId, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
      })
    },
    [setEntries]
  )

  /** ID товаров в порядке просмотра (последний первым) */
  const productIds = useMemo(() => entries.map((e: ViewEntry) => e.productId), [entries])

  /** Очистить историю */
  const clearHistory = useCallback(() => {
    removeEntries()
  }, [removeEntries])

  return { addView, productIds, clearHistory }
}
