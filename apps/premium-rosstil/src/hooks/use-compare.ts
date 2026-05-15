'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const IDB_KEY = 'COMPARE_ITEMS'
const MAX_COMPARE_ITEMS = 4

/**
 * Данные для сравнения товара
 */
export interface CompareItem {
  variantId: string
  productId: string
  productName: string
  variantColor: string
  composition: string
  imageUrl?: string
  price: number
  sizes: string[]
  addedAt: string
  notes?: {
    pros: string[] // Плюсы
    cons: string[] // Минусы
  }
}

/**
 * Состояние сравнения
 */
interface CompareState {
  items: CompareItem[]
  version: number
}

// Глобальное состояние для синхронизации между вкладками
let compareState: CompareState = { items: [], version: 0 }
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function subscribe(callback: () => void) {
  listeners.add(callback)
  return () => {
    listeners.delete(callback)
  }
}

function getSnapshot() {
  return compareState
}

// Закэшированный серверный снэпшот (требуется для useSyncExternalStore)
const SERVER_SNAPSHOT: CompareState = { items: [], version: 0 }

function getServerSnapshot(): CompareState {
  return SERVER_SNAPSHOT
}

/**
 * Сброс состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __resetCompareState() {
  compareState = { items: [], version: 0 }
  listeners.clear()
}

/**
 * Установка начального состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __setCompareState(items: CompareItem[]) {
  compareState = { items, version: compareState.version + 1 }
  listeners.forEach((l) => l())
}

/**
 * Хук для управления сравнением товаров.
 * Сохраняет до 4 товаров в IndexedDB для оффлайн доступа.
 */
export function useCompare() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при первом рендере
  useEffect(() => {
    const loadCompareItems = async () => {
      try {
        const stored = await get<CompareItem[]>(IDB_KEY)
        if (stored && stored.length > 0) {
          compareState = { items: stored, version: compareState.version + 1 }
          notifyListeners()
        }
      } catch (error) {
        console.error('Ошибка загрузки списка сравнения:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCompareItems()
  }, [])

  // Сохранение в IndexedDB
  const saveToIDB = useCallback(async (items: CompareItem[]) => {
    try {
      await set(IDB_KEY, items)
    } catch (error) {
      console.error('Ошибка сохранения списка сравнения:', error)
    }
  }, [])

  // Добавление товара в сравнение
  const addToCompare = useCallback(
    async (item: Omit<CompareItem, 'addedAt' | 'notes'>) => {
      if (state.items.length >= MAX_COMPARE_ITEMS) {
        return { success: false, error: 'Максимум 4 товара для сравнения' }
      }

      if (state.items.some((i) => i.variantId === item.variantId)) {
        return { success: false, error: 'Товар уже добавлен в сравнение' }
      }

      const newItem: CompareItem = {
        ...item,
        addedAt: new Date().toISOString(),
        notes: { pros: [], cons: [] },
      }

      const updated = [...state.items, newItem]
      compareState = { items: updated, version: compareState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.items, saveToIDB]
  )

  // Удаление товара из сравнения
  const removeFromCompare = useCallback(
    async (variantId: string) => {
      const updated = state.items.filter((i) => i.variantId !== variantId)
      compareState = { items: updated, version: compareState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.items, saveToIDB]
  )

  // Очистить всё сравнение
  const clearCompare = useCallback(async () => {
    compareState = { items: [], version: compareState.version + 1 }
    notifyListeners()
    await saveToIDB([])
    return { success: true }
  }, [saveToIDB])

  // Проверить, есть ли товар в сравнении
  const isInCompare = useCallback(
    (variantId: string) => {
      return state.items.some((i) => i.variantId === variantId)
    },
    [state.items]
  )

  // Переключить товар в сравнении
  const toggleCompare = useCallback(
    async (item: Omit<CompareItem, 'addedAt' | 'notes'>) => {
      if (isInCompare(item.variantId)) {
        return removeFromCompare(item.variantId)
      } else {
        return addToCompare(item)
      }
    },
    [isInCompare, addToCompare, removeFromCompare]
  )

  // Добавить заметку "плюс"
  const addPro = useCallback(
    async (variantId: string, pro: string) => {
      const updated = state.items.map((item) => {
        if (item.variantId === variantId) {
          return {
            ...item,
            notes: {
              pros: [...(item.notes?.pros || []), pro],
              cons: item.notes?.cons || [],
            },
          }
        }
        return item
      })
      compareState = { items: updated, version: compareState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.items, saveToIDB]
  )

  // Добавить заметку "минус"
  const addCon = useCallback(
    async (variantId: string, con: string) => {
      const updated = state.items.map((item) => {
        if (item.variantId === variantId) {
          return {
            ...item,
            notes: {
              pros: item.notes?.pros || [],
              cons: [...(item.notes?.cons || []), con],
            },
          }
        }
        return item
      })
      compareState = { items: updated, version: compareState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.items, saveToIDB]
  )

  // Удалить заметку "плюс"
  const removePro = useCallback(
    async (variantId: string, index: number) => {
      const updated = state.items.map((item) => {
        if (item.variantId === variantId) {
          const newPros = [...(item.notes?.pros || [])]
          newPros.splice(index, 1)
          return {
            ...item,
            notes: {
              pros: newPros,
              cons: item.notes?.cons || [],
            },
          }
        }
        return item
      })
      compareState = { items: updated, version: compareState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.items, saveToIDB]
  )

  // Удалить заметку "минус"
  const removeCon = useCallback(
    async (variantId: string, index: number) => {
      const updated = state.items.map((item) => {
        if (item.variantId === variantId) {
          const newCons = [...(item.notes?.cons || [])]
          newCons.splice(index, 1)
          return {
            ...item,
            notes: {
              pros: item.notes?.pros || [],
              cons: newCons,
            },
          }
        }
        return item
      })
      compareState = { items: updated, version: compareState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.items, saveToIDB]
  )

  return {
    items: state.items,
    isLoading,
    count: state.items.length,
    isFull: state.items.length >= MAX_COMPARE_ITEMS,
    maxItems: MAX_COMPARE_ITEMS,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    toggleCompare,
    addPro,
    addCon,
    removePro,
    removeCon,
  }
}
