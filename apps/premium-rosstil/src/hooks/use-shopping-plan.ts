'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const IDB_KEY = 'SHOPPING_PLAN'

/**
 * Приоритет покупки
 */
export type ShoppingPriority = 'now' | 'next_month' | 'someday'

/**
 * Конфигурация приоритетов
 */
export const PRIORITY_CONFIG: Record<ShoppingPriority, { label: string; emoji: string; color: string }> = {
  now: { label: 'Купить сейчас', emoji: '🔥', color: 'red' },
  next_month: { label: 'В следующем месяце', emoji: '📅', color: 'orange' },
  someday: { label: 'Когда-нибудь', emoji: '💭', color: 'gray' },
}

/**
 * Элемент плана покупок
 */
export interface PlannedItem {
  variantId: string
  productId: string
  productName: string
  variantColor: string
  imageUrl?: string
  price: number
  priority: ShoppingPriority
  addedAt: string
  note?: string
}

/**
 * План покупок
 */
export interface ShoppingPlan {
  budget: number // Месячный бюджет
  items: PlannedItem[]
  updatedAt: string
}

/**
 * Состояние плана покупок
 */
interface ShoppingPlanState {
  plan: ShoppingPlan
  version: number
}

const DEFAULT_PLAN: ShoppingPlan = {
  budget: 0,
  items: [],
  updatedAt: new Date().toISOString(),
}

// Глобальное состояние для синхронизации между вкладками
let planState: ShoppingPlanState = { plan: DEFAULT_PLAN, version: 0 }
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
  return planState
}

// Закэшированный серверный снэпшот (требуется для useSyncExternalStore)
const SERVER_SNAPSHOT: ShoppingPlanState = { plan: DEFAULT_PLAN, version: 0 }

function getServerSnapshot(): ShoppingPlanState {
  return SERVER_SNAPSHOT
}

/**
 * Сброс состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __resetShoppingPlanState() {
  planState = { plan: { ...DEFAULT_PLAN, updatedAt: new Date().toISOString() }, version: 0 }
  listeners.clear()
}

/**
 * Установка начального состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __setShoppingPlanState(plan: ShoppingPlan) {
  planState = { plan, version: planState.version + 1 }
  listeners.forEach((l) => l())
}

/**
 * Хук для управления планом покупок и бюджетом.
 * Сохраняет план в IndexedDB для оффлайн доступа.
 */
export function useShoppingPlan() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при первом рендере
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const stored = await get<ShoppingPlan>(IDB_KEY)
        if (stored) {
          planState = { plan: stored, version: planState.version + 1 }
          notifyListeners()
        }
      } catch (error) {
        console.error('Ошибка загрузки плана покупок:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadPlan()
  }, [])

  // Сохранение в IndexedDB
  const saveToIDB = useCallback(async (plan: ShoppingPlan) => {
    try {
      await set(IDB_KEY, plan)
    } catch (error) {
      console.error('Ошибка сохранения плана покупок:', error)
    }
  }, [])

  // Установка бюджета
  const setBudget = useCallback(
    async (budget: number) => {
      const updated: ShoppingPlan = {
        ...state.plan,
        budget,
        updatedAt: new Date().toISOString(),
      }
      planState = { plan: updated, version: planState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.plan, saveToIDB]
  )

  // Добавление товара в план
  const addItem = useCallback(
    async (item: Omit<PlannedItem, 'addedAt'>) => {
      // Проверяем, есть ли уже этот товар
      if (state.plan.items.some((i) => i.variantId === item.variantId)) {
        return { success: false, error: 'Товар уже в плане покупок' }
      }

      const newItem: PlannedItem = {
        ...item,
        addedAt: new Date().toISOString(),
      }

      const updated: ShoppingPlan = {
        ...state.plan,
        items: [...state.plan.items, newItem],
        updatedAt: new Date().toISOString(),
      }
      planState = { plan: updated, version: planState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.plan, saveToIDB]
  )

  // Удаление товара из плана
  const removeItem = useCallback(
    async (variantId: string) => {
      const updated: ShoppingPlan = {
        ...state.plan,
        items: state.plan.items.filter((i) => i.variantId !== variantId),
        updatedAt: new Date().toISOString(),
      }
      planState = { plan: updated, version: planState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.plan, saveToIDB]
  )

  // Изменение приоритета товара
  const updatePriority = useCallback(
    async (variantId: string, priority: ShoppingPriority) => {
      const updated: ShoppingPlan = {
        ...state.plan,
        items: state.plan.items.map((i) => (i.variantId === variantId ? { ...i, priority } : i)),
        updatedAt: new Date().toISOString(),
      }
      planState = { plan: updated, version: planState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.plan, saveToIDB]
  )

  // Обновление заметки
  const updateNote = useCallback(
    async (variantId: string, note: string) => {
      const updated: ShoppingPlan = {
        ...state.plan,
        items: state.plan.items.map((i) => (i.variantId === variantId ? { ...i, note } : i)),
        updatedAt: new Date().toISOString(),
      }
      planState = { plan: updated, version: planState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.plan, saveToIDB]
  )

  // Проверить, есть ли товар в плане
  const isInPlan = useCallback(
    (variantId: string) => {
      return state.plan.items.some((i) => i.variantId === variantId)
    },
    [state.plan.items]
  )

  // Получить товар из плана
  const getItem = useCallback(
    (variantId: string) => {
      return state.plan.items.find((i) => i.variantId === variantId)
    },
    [state.plan.items]
  )

  // Очистить план
  const clearPlan = useCallback(async () => {
    const updated: ShoppingPlan = {
      budget: state.plan.budget,
      items: [],
      updatedAt: new Date().toISOString(),
    }
    planState = { plan: updated, version: planState.version + 1 }
    notifyListeners()
    await saveToIDB(updated)
    return { success: true }
  }, [state.plan.budget, saveToIDB])

  // Вычисляемые значения
  const items = state.plan.items
  const budget = state.plan.budget

  // Суммы по приоритетам
  const totalNow = items.filter((i) => i.priority === 'now').reduce((sum, i) => sum + i.price, 0)
  const totalNextMonth = items.filter((i) => i.priority === 'next_month').reduce((sum, i) => sum + i.price, 0)
  const totalSomeday = items.filter((i) => i.priority === 'someday').reduce((sum, i) => sum + i.price, 0)
  const totalPlanned = totalNow + totalNextMonth + totalSomeday

  // Статус бюджета
  const isOverBudget = budget > 0 && totalNow > budget
  const budgetRemaining = budget > 0 ? budget - totalNow : 0
  const budgetUsedPercent = budget > 0 ? Math.min((totalNow / budget) * 100, 100) : 0

  // Количество товаров по приоритетам
  const countNow = items.filter((i) => i.priority === 'now').length
  const countNextMonth = items.filter((i) => i.priority === 'next_month').length
  const countSomeday = items.filter((i) => i.priority === 'someday').length

  return {
    items,
    budget,
    isLoading,
    setBudget,
    addItem,
    removeItem,
    updatePriority,
    updateNote,
    isInPlan,
    getItem,
    clearPlan,
    // Суммы
    totalNow,
    totalNextMonth,
    totalSomeday,
    totalPlanned,
    // Статус бюджета
    isOverBudget,
    budgetRemaining,
    budgetUsedPercent,
    // Количества
    countNow,
    countNextMonth,
    countSomeday,
    totalItems: items.length,
  }
}
