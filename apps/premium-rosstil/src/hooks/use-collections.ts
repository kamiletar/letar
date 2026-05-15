'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const IDB_KEY = 'USER_COLLECTIONS'

/**
 * Элемент коллекции (товар)
 */
export interface CollectionItem {
  variantId: string
  productId: string
  productName: string
  variantColor: string
  imageUrl?: string
  price: number
  note?: string // Комментарий к товару в контексте коллекции
  position: number // Для сортировки
  addedAt: string
}

/**
 * Коллекция (Mood Board)
 */
export interface Collection {
  id: string
  name: string
  description?: string
  coverImage?: string
  emoji?: string // Эмодзи для обложки
  isPublic: boolean
  items: CollectionItem[]
  createdAt: string
  updatedAt: string
}

/**
 * Предустановленные шаблоны коллекций
 */
export const COLLECTION_TEMPLATES = [
  { name: 'Капсула на сезон', emoji: '👗', description: 'Базовый гардероб на сезон' },
  { name: 'Wish list', emoji: '💫', description: 'Хочу купить' },
  { name: 'Подарки', emoji: '🎁', description: 'Идеи для подарков' },
  { name: 'Для отпуска', emoji: '🏖️', description: 'Вещи для путешествия' },
  { name: 'На особый случай', emoji: '✨', description: 'Для важных событий' },
  { name: 'Рабочий гардероб', emoji: '💼', description: 'Для офиса' },
] as const

/**
 * Состояние коллекций
 */
interface CollectionsState {
  collections: Collection[]
  version: number
}

// Глобальное состояние для синхронизации между вкладками
let collectionsState: CollectionsState = { collections: [], version: 0 }
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
  return collectionsState
}

// Закэшированный серверный снэпшот (требуется для useSyncExternalStore)
const SERVER_SNAPSHOT: CollectionsState = { collections: [], version: 0 }

function getServerSnapshot(): CollectionsState {
  return SERVER_SNAPSHOT
}

/**
 * Сброс состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __resetCollectionsState() {
  collectionsState = { collections: [], version: 0 }
  listeners.clear()
}

/**
 * Установка начального состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __setCollectionsState(collections: Collection[]) {
  collectionsState = { collections, version: collectionsState.version + 1 }
  listeners.forEach((l) => l())
}

/**
 * Хук для управления личными коллекциями (Mood Boards).
 * Сохраняет коллекции в IndexedDB для оффлайн доступа.
 */
export function useCollections() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при первом рендере
  useEffect(() => {
    const loadCollections = async () => {
      try {
        const stored = await get<Collection[]>(IDB_KEY)
        if (stored && stored.length > 0) {
          collectionsState = { collections: stored, version: collectionsState.version + 1 }
          notifyListeners()
        }
      } catch (error) {
        console.error('Ошибка загрузки коллекций:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadCollections()
  }, [])

  // Сохранение в IndexedDB
  const saveToIDB = useCallback(async (collections: Collection[]) => {
    try {
      await set(IDB_KEY, collections)
    } catch (error) {
      console.error('Ошибка сохранения коллекций:', error)
    }
  }, [])

  // Создание коллекции
  const createCollection = useCallback(
    async (data: { name: string; description?: string; emoji?: string }) => {
      const newCollection: Collection = {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        emoji: data.emoji,
        isPublic: false,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updated = [...state.collections, newCollection]
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true, collection: newCollection }
    },
    [state.collections, saveToIDB]
  )

  // Создание коллекции из шаблона
  const createFromTemplate = useCallback(
    async (template: (typeof COLLECTION_TEMPLATES)[number]) => {
      return createCollection({
        name: template.name,
        description: template.description,
        emoji: template.emoji,
      })
    },
    [createCollection]
  )

  // Обновление коллекции
  const updateCollection = useCallback(
    async (
      id: string,
      data: Partial<Pick<Collection, 'name' | 'description' | 'emoji' | 'isPublic' | 'coverImage'>>
    ) => {
      const updated = state.collections.map((c) =>
        c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c
      )
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.collections, saveToIDB]
  )

  // Удаление коллекции
  const deleteCollection = useCallback(
    async (id: string) => {
      const updated = state.collections.filter((c) => c.id !== id)
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.collections, saveToIDB]
  )

  // Добавление товара в коллекцию
  const addItemToCollection = useCallback(
    async (collectionId: string, item: Omit<CollectionItem, 'position' | 'addedAt' | 'note'>) => {
      const collection = state.collections.find((c) => c.id === collectionId)
      if (!collection) {
        return { success: false, error: 'Коллекция не найдена' }
      }

      // Проверяем, есть ли уже этот товар
      if (collection.items.some((i) => i.variantId === item.variantId)) {
        return { success: false, error: 'Товар уже в коллекции' }
      }

      const newItem: CollectionItem = {
        ...item,
        position: collection.items.length,
        addedAt: new Date().toISOString(),
      }

      const updated = state.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              items: [...c.items, newItem],
              // Обновляем обложку если это первый товар
              coverImage: c.coverImage || item.imageUrl,
              updatedAt: new Date().toISOString(),
            }
          : c
      )
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.collections, saveToIDB]
  )

  // Удаление товара из коллекции
  const removeItemFromCollection = useCallback(
    async (collectionId: string, variantId: string) => {
      const updated = state.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              items: c.items.filter((i) => i.variantId !== variantId),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.collections, saveToIDB]
  )

  // Обновление заметки к товару
  const updateItemNote = useCallback(
    async (collectionId: string, variantId: string, note: string) => {
      const updated = state.collections.map((c) =>
        c.id === collectionId
          ? {
              ...c,
              items: c.items.map((i) => (i.variantId === variantId ? { ...i, note } : i)),
              updatedAt: new Date().toISOString(),
            }
          : c
      )
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.collections, saveToIDB]
  )

  // Перестановка товаров (drag & drop)
  const reorderItems = useCallback(
    async (collectionId: string, fromIndex: number, toIndex: number) => {
      const collection = state.collections.find((c) => c.id === collectionId)
      if (!collection) {
        return { success: false }
      }

      const items = [...collection.items]
      const [removed] = items.splice(fromIndex, 1)
      items.splice(toIndex, 0, removed)

      // Обновляем позиции
      const reorderedItems = items.map((item, index) => ({
        ...item,
        position: index,
      }))

      const updated = state.collections.map((c) =>
        c.id === collectionId ? { ...c, items: reorderedItems, updatedAt: new Date().toISOString() } : c
      )
      collectionsState = { collections: updated, version: collectionsState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)
      return { success: true }
    },
    [state.collections, saveToIDB]
  )

  // Проверить, в каких коллекциях есть товар
  const getCollectionsWithItem = useCallback(
    (variantId: string) => {
      return state.collections.filter((c) => c.items.some((i) => i.variantId === variantId))
    },
    [state.collections]
  )

  // Получить коллекцию по ID
  const getCollection = useCallback(
    (id: string) => {
      return state.collections.find((c) => c.id === id)
    },
    [state.collections]
  )

  return {
    collections: state.collections,
    isLoading,
    totalCollections: state.collections.length,
    createCollection,
    createFromTemplate,
    updateCollection,
    deleteCollection,
    addItemToCollection,
    removeItemFromCollection,
    updateItemNote,
    reorderItems,
    getCollectionsWithItem,
    getCollection,
  }
}
