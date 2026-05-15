'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState } from 'react'

const IDB_KEY = 'ORDER_DRAFTS'

/**
 * Тип заказа
 */
export type OrderDraftType = 'standard' | 'custom' | 'b2b'

/**
 * Статус черновика
 */
export type OrderDraftStatus = 'draft' | 'pending_sync' | 'synced'

/**
 * Элемент корзины в черновике
 */
export interface DraftCartItem {
  productSlug: string
  productName: string
  productImage?: string
  size?: string
  color?: string
  quantity: number
  price: number
}

/**
 * Данные получателя
 */
export interface DraftRecipient {
  name: string
  phone: string
  email?: string
}

/**
 * Адрес доставки
 */
export interface DraftAddress {
  city: string
  street: string
  house: string
  apartment?: string
  postalCode?: string
  comment?: string
}

/**
 * Структура черновика заказа
 */
export interface OrderDraft {
  id: string
  type: OrderDraftType
  name?: string // Пользовательское название
  createdAt: string
  updatedAt: string
  status: OrderDraftStatus

  // Товары
  items: DraftCartItem[]

  // Данные получателя
  recipient?: DraftRecipient

  // Адрес доставки
  address?: DraftAddress

  // Заметка к заказу
  note?: string
}

/**
 * Хук для управления черновиками заказов.
 * Сохраняет черновики в IndexedDB для оффлайн доступа.
 */
export function useOrderDrafts() {
  const [drafts, setDrafts] = useState<OrderDraft[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB
  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const stored = await get<OrderDraft[]>(IDB_KEY)
        if (stored) {
          setDrafts(stored)
        }
      } catch (error) {
        console.error('Ошибка загрузки черновиков:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadDrafts()
  }, [])

  // Создание нового черновика
  const createDraft = useCallback(
    async (items: DraftCartItem[], name?: string, type: OrderDraftType = 'standard') => {
      const now = new Date().toISOString()

      const newDraft: OrderDraft = {
        id: crypto.randomUUID(),
        type,
        name: name || `Заказ от ${new Date().toLocaleDateString('ru-RU')}`,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
        items,
      }

      const updated = [...drafts, newDraft]
      try {
        await set(IDB_KEY, updated)
        setDrafts(updated)
        return { success: true, draft: newDraft }
      } catch (error) {
        console.error('Ошибка сохранения черновика:', error)
        return { success: false, error }
      }
    },
    [drafts]
  )

  // Обновление черновика
  const updateDraft = useCallback(
    async (draftId: string, updates: Partial<Omit<OrderDraft, 'id' | 'createdAt'>>) => {
      const updated = drafts.map((d) =>
        d.id === draftId
          ? {
              ...d,
              ...updates,
              updatedAt: new Date().toISOString(),
            }
          : d
      )
      try {
        await set(IDB_KEY, updated)
        setDrafts(updated)
        return { success: true }
      } catch (error) {
        console.error('Ошибка обновления черновика:', error)
        return { success: false, error }
      }
    },
    [drafts]
  )

  // Добавление товара в черновик
  const addItemToDraft = useCallback(
    async (draftId: string, item: DraftCartItem) => {
      const draft = drafts.find((d) => d.id === draftId)
      if (!draft) {
        return { success: false, error: 'Черновик не найден' }
      }

      // Проверяем есть ли уже такой товар
      const existingIndex = draft.items.findIndex(
        (i) => i.productSlug === item.productSlug && i.size === item.size && i.color === item.color
      )

      let newItems: DraftCartItem[]
      if (existingIndex >= 0) {
        // Увеличиваем количество
        newItems = draft.items.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + item.quantity } : i
        )
      } else {
        // Добавляем новый товар
        newItems = [...draft.items, item]
      }

      return updateDraft(draftId, { items: newItems })
    },
    [drafts, updateDraft]
  )

  // Удаление товара из черновика
  const removeItemFromDraft = useCallback(
    async (draftId: string, productSlug: string, size?: string, color?: string) => {
      const draft = drafts.find((d) => d.id === draftId)
      if (!draft) {
        return { success: false, error: 'Черновик не найден' }
      }

      const newItems = draft.items.filter(
        (i) => !(i.productSlug === productSlug && i.size === size && i.color === color)
      )

      return updateDraft(draftId, { items: newItems })
    },
    [drafts, updateDraft]
  )

  // Обновление количества товара
  const updateItemQuantity = useCallback(
    async (draftId: string, productSlug: string, quantity: number, size?: string, color?: string) => {
      const draft = drafts.find((d) => d.id === draftId)
      if (!draft) {
        return { success: false, error: 'Черновик не найден' }
      }

      const newItems = draft.items.map((i) =>
        i.productSlug === productSlug && i.size === size && i.color === color ? { ...i, quantity } : i
      )

      return updateDraft(draftId, { items: newItems })
    },
    [drafts, updateDraft]
  )

  // Установка данных получателя
  const setRecipient = useCallback(
    async (draftId: string, recipient: DraftRecipient) => {
      return updateDraft(draftId, { recipient })
    },
    [updateDraft]
  )

  // Установка адреса доставки
  const setAddress = useCallback(
    async (draftId: string, address: DraftAddress) => {
      return updateDraft(draftId, { address })
    },
    [updateDraft]
  )

  // Установка заметки
  const setNote = useCallback(
    async (draftId: string, note: string) => {
      return updateDraft(draftId, { note })
    },
    [updateDraft]
  )

  // Удаление черновика
  const deleteDraft = useCallback(
    async (draftId: string) => {
      const updated = drafts.filter((d) => d.id !== draftId)
      try {
        await set(IDB_KEY, updated)
        setDrafts(updated)
        return { success: true }
      } catch (error) {
        console.error('Ошибка удаления черновика:', error)
        return { success: false, error }
      }
    },
    [drafts]
  )

  // Получить черновик по ID
  const getDraft = useCallback(
    (draftId: string) => {
      return drafts.find((d) => d.id === draftId)
    },
    [drafts]
  )

  // Пометить как ожидающий синхронизации
  const markPendingSync = useCallback(
    async (draftId: string) => {
      return updateDraft(draftId, { status: 'pending_sync' })
    },
    [updateDraft]
  )

  // Пометить как синхронизированный
  const markSynced = useCallback(
    async (draftId: string) => {
      return updateDraft(draftId, { status: 'synced' })
    },
    [updateDraft]
  )

  // Подсчёт стоимости черновика
  const calculateDraftTotal = useCallback((draft: OrderDraft) => {
    return draft.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  }, [])

  // Подсчёт количества товаров
  const calculateDraftItemCount = useCallback((draft: OrderDraft) => {
    return draft.items.reduce((sum, item) => sum + item.quantity, 0)
  }, [])

  // Проверка готовности к оформлению
  const isDraftReadyToSubmit = useCallback((draft: OrderDraft) => {
    return draft.items.length > 0 && draft.recipient && draft.address
  }, [])

  return {
    drafts,
    isLoading,
    createDraft,
    updateDraft,
    addItemToDraft,
    removeItemFromDraft,
    updateItemQuantity,
    setRecipient,
    setAddress,
    setNote,
    deleteDraft,
    getDraft,
    markPendingSync,
    markSynced,
    calculateDraftTotal,
    calculateDraftItemCount,
    isDraftReadyToSubmit,
    totalDrafts: drafts.length,
    pendingSyncDrafts: drafts.filter((d) => d.status === 'pending_sync'),
  }
}
