'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const IDB_KEY = 'SEASON_CHECKLIST'

/**
 * Сезон
 */
export type Season = 'spring' | 'summer' | 'fall' | 'winter'

/**
 * Статус элемента чеклиста
 */
export type ChecklistItemStatus = 'need' | 'have' | 'want'

/**
 * Конфигурация сезонов
 */
export const SEASON_CONFIG: Record<Season, { label: string; emoji: string; months: string }> = {
  spring: { label: 'Весна', emoji: '🌸', months: 'Март — Май' },
  summer: { label: 'Лето', emoji: '☀️', months: 'Июнь — Август' },
  fall: { label: 'Осень', emoji: '🍂', months: 'Сентябрь — Ноябрь' },
  winter: { label: 'Зима', emoji: '❄️', months: 'Декабрь — Февраль' },
}

/**
 * Конфигурация статусов
 */
export const STATUS_CONFIG: Record<ChecklistItemStatus, { label: string; emoji: string; color: string }> = {
  need: { label: 'Нужно купить', emoji: '🛒', color: 'red' },
  have: { label: 'Уже есть', emoji: '✅', color: 'green' },
  want: { label: 'Хочу', emoji: '💭', color: 'purple' },
}

/**
 * Категория чеклиста
 */
export interface ChecklistCategory {
  name: string
  emoji: string
  items: string[]
}

/**
 * Предустановленные чеклисты по сезонам
 */
export const SEASON_CHECKLISTS: Record<Season, ChecklistCategory[]> = {
  spring: [
    { name: 'Верхняя одежда', emoji: '🧥', items: ['Тренч', 'Лёгкая куртка', 'Кардиган', 'Джинсовка'] },
    { name: 'Верх', emoji: '👚', items: ['Блузка', 'Рубашка', 'Свитер лёгкий', 'Водолазка'] },
    { name: 'Низ', emoji: '👖', items: ['Джинсы', 'Брюки', 'Юбка миди', 'Шорты'] },
    { name: 'Платья', emoji: '👗', items: ['Платье на каждый день', 'Платье нарядное'] },
    { name: 'Обувь', emoji: '👟', items: ['Лоферы', 'Кеды', 'Балетки', 'Ботильоны'] },
    { name: 'Аксессуары', emoji: '👜', items: ['Сумка', 'Шарф лёгкий', 'Зонт', 'Солнцезащитные очки'] },
  ],
  summer: [
    { name: 'Верхняя одежда', emoji: '🧥', items: ['Лёгкий жакет', 'Кардиган', 'Ветровка'] },
    { name: 'Верх', emoji: '👚', items: ['Топ', 'Футболка', 'Майка', 'Блузка лёгкая', 'Рубашка льняная'] },
    { name: 'Низ', emoji: '👖', items: ['Шорты', 'Юбка', 'Лёгкие брюки', 'Джинсы лёгкие'] },
    { name: 'Платья', emoji: '👗', items: ['Сарафан', 'Платье макси', 'Платье пляжное', 'Комбинезон'] },
    { name: 'Обувь', emoji: '👟', items: ['Сандалии', 'Босоножки', 'Эспадрильи', 'Кеды лёгкие'] },
    { name: 'Аксессуары', emoji: '👜', items: ['Соломенная сумка', 'Шляпа', 'Солнцезащитные очки', 'Парео'] },
    { name: 'Пляж', emoji: '🏖️', items: ['Купальник', 'Накидка пляжная', 'Шлёпанцы'] },
  ],
  fall: [
    { name: 'Верхняя одежда', emoji: '🧥', items: ['Пальто', 'Тренч', 'Куртка утеплённая', 'Жилет'] },
    { name: 'Верх', emoji: '👚', items: ['Свитер', 'Водолазка', 'Рубашка фланелевая', 'Блузка'] },
    { name: 'Низ', emoji: '👖', items: ['Джинсы', 'Брюки тёплые', 'Юбка с колготками', 'Леггинсы'] },
    { name: 'Платья', emoji: '👗', items: ['Платье трикотажное', 'Платье-свитер'] },
    { name: 'Обувь', emoji: '👟', items: ['Ботинки', 'Ботильоны', 'Лоферы', 'Кроссовки'] },
    { name: 'Аксессуары', emoji: '👜', items: ['Шарф тёплый', 'Шапка', 'Перчатки', 'Сумка кожаная'] },
  ],
  winter: [
    { name: 'Верхняя одежда', emoji: '🧥', items: ['Пуховик', 'Шуба/Дублёнка', 'Пальто зимнее'] },
    { name: 'Верх', emoji: '👚', items: ['Свитер тёплый', 'Водолазка', 'Термобельё', 'Худи'] },
    { name: 'Низ', emoji: '👖', items: ['Джинсы утеплённые', 'Брюки тёплые', 'Юбка с колготками'] },
    { name: 'Платья', emoji: '👗', items: ['Платье вязаное', 'Платье с длинным рукавом'] },
    { name: 'Обувь', emoji: '👟', items: ['Сапоги зимние', 'Ботинки утеплённые', 'Угги/Валенки'] },
    { name: 'Аксессуары', emoji: '👜', items: ['Шапка тёплая', 'Шарф/Снуд', 'Перчатки/Варежки', 'Термоноски'] },
  ],
}

/**
 * Элемент пользовательского чеклиста
 */
export interface UserChecklistItem {
  id: string
  name: string
  category: string
  status: ChecklistItemStatus
  productId?: string // ID товара из каталога
  productName?: string
  note?: string
}

/**
 * Пользовательский чеклист на сезон
 */
export interface UserSeasonChecklist {
  season: Season
  items: UserChecklistItem[]
  createdAt: string
  updatedAt: string
}

/**
 * Все чеклисты пользователя
 */
export interface SeasonChecklistsData {
  checklists: UserSeasonChecklist[]
  updatedAt: string
}

/**
 * Состояние чеклистов
 */
interface ChecklistState {
  data: SeasonChecklistsData
  version: number
}

const DEFAULT_DATA: SeasonChecklistsData = {
  checklists: [],
  updatedAt: new Date().toISOString(),
}

// Глобальное состояние для синхронизации между вкладками
let checklistState: ChecklistState = { data: DEFAULT_DATA, version: 0 }
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
  return checklistState
}

// Закэшированный серверный снэпшот (требуется для useSyncExternalStore)
const SERVER_SNAPSHOT: ChecklistState = { data: DEFAULT_DATA, version: 0 }

function getServerSnapshot(): ChecklistState {
  return SERVER_SNAPSHOT
}

/**
 * Сброс состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __resetChecklistState() {
  checklistState = { data: { ...DEFAULT_DATA, updatedAt: new Date().toISOString() }, version: 0 }
  listeners.clear()
}

/**
 * Установка начального состояния для тестов.
 * НЕ использовать в продакшене!
 */
export function __setChecklistState(data: SeasonChecklistsData) {
  checklistState = { data, version: checklistState.version + 1 }
  listeners.forEach((l) => l())
}

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Хук для управления чеклистами на сезон.
 * Сохраняет данные в IndexedDB для оффлайн доступа.
 */
export function useSeasonChecklist() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при первом рендере
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await get<SeasonChecklistsData>(IDB_KEY)
        if (stored) {
          checklistState = { data: stored, version: checklistState.version + 1 }
          notifyListeners()
        }
      } catch (error) {
        console.error('Ошибка загрузки чеклистов:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Сохранение в IndexedDB
  const saveToIDB = useCallback(async (data: SeasonChecklistsData) => {
    try {
      await set(IDB_KEY, data)
    } catch (error) {
      console.error('Ошибка сохранения чеклистов:', error)
    }
  }, [])

  // Получить чеклист по сезону
  const getChecklist = useCallback(
    (season: Season) => {
      return state.data.checklists.find((c) => c.season === season)
    },
    [state.data.checklists]
  )

  // Создать чеклист из шаблона
  const createFromTemplate = useCallback(
    async (season: Season) => {
      // Проверяем, нет ли уже чеклиста на этот сезон
      if (state.data.checklists.some((c) => c.season === season)) {
        return { success: false, error: 'Чеклист на этот сезон уже существует' }
      }

      const template = SEASON_CHECKLISTS[season]
      const items: UserChecklistItem[] = []

      for (const category of template) {
        for (const itemName of category.items) {
          items.push({
            id: generateId(),
            name: itemName,
            category: category.name,
            status: 'need',
          })
        }
      }

      const newChecklist: UserSeasonChecklist = {
        season,
        items,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updated: SeasonChecklistsData = {
        checklists: [...state.data.checklists, newChecklist],
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true, checklist: newChecklist }
    },
    [state.data.checklists, saveToIDB]
  )

  // Обновить статус элемента
  const updateItemStatus = useCallback(
    async (season: Season, itemId: string, status: ChecklistItemStatus) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: c.items.map((i) => (i.id === itemId ? { ...i, status } : i)),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Привязать товар к элементу
  const linkProduct = useCallback(
    async (season: Season, itemId: string, productId: string, productName: string) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: c.items.map((i) => (i.id === itemId ? { ...i, productId, productName } : i)),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Отвязать товар от элемента
  const unlinkProduct = useCallback(
    async (season: Season, itemId: string) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: c.items.map((i) =>
                  i.id === itemId ? { ...i, productId: undefined, productName: undefined } : i
                ),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Добавить заметку к элементу
  const updateItemNote = useCallback(
    async (season: Season, itemId: string, note: string) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: c.items.map((i) => (i.id === itemId ? { ...i, note } : i)),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Добавить кастомный элемент
  const addCustomItem = useCallback(
    async (season: Season, name: string, category: string) => {
      const newItem: UserChecklistItem = {
        id: generateId(),
        name,
        category,
        status: 'need',
      }

      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: [...c.items, newItem],
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true, item: newItem }
    },
    [state.data.checklists, saveToIDB]
  )

  // Удалить элемент
  const removeItem = useCallback(
    async (season: Season, itemId: string) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: c.items.filter((i) => i.id !== itemId),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Удалить чеклист
  const deleteChecklist = useCallback(
    async (season: Season) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.filter((c) => c.season !== season),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Сбросить чеклист (все элементы в "need")
  const resetChecklist = useCallback(
    async (season: Season) => {
      const updated: SeasonChecklistsData = {
        checklists: state.data.checklists.map((c) =>
          c.season === season
            ? {
                ...c,
                items: c.items.map((i) => ({ ...i, status: 'need' as ChecklistItemStatus })),
                updatedAt: new Date().toISOString(),
              }
            : c
        ),
        updatedAt: new Date().toISOString(),
      }

      checklistState = { data: updated, version: checklistState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.checklists, saveToIDB]
  )

  // Вычисляемые значения для конкретного сезона
  const getStats = useCallback(
    (season: Season) => {
      const checklist = state.data.checklists.find((c) => c.season === season)
      if (!checklist) {
        return {
          total: 0,
          have: 0,
          need: 0,
          want: 0,
          progress: 0,
          byCategory: {} as Record<string, { total: number; have: number; need: number; want: number }>,
        }
      }

      const total = checklist.items.length
      const have = checklist.items.filter((i) => i.status === 'have').length
      const need = checklist.items.filter((i) => i.status === 'need').length
      const want = checklist.items.filter((i) => i.status === 'want').length
      const progress = total > 0 ? Math.round((have / total) * 100) : 0

      // Статистика по категориям
      const byCategory: Record<string, { total: number; have: number; need: number; want: number }> = {}
      for (const item of checklist.items) {
        if (!byCategory[item.category]) {
          byCategory[item.category] = { total: 0, have: 0, need: 0, want: 0 }
        }
        byCategory[item.category].total++
        byCategory[item.category][item.status]++
      }

      return { total, have, need, want, progress, byCategory }
    },
    [state.data.checklists]
  )

  // Получить текущий сезон
  const getCurrentSeason = useCallback((): Season => {
    const month = new Date().getMonth()
    if (month >= 2 && month <= 4) {
      return 'spring'
    }
    if (month >= 5 && month <= 7) {
      return 'summer'
    }
    if (month >= 8 && month <= 10) {
      return 'fall'
    }
    return 'winter'
  }, [])

  return {
    checklists: state.data.checklists,
    isLoading,
    getChecklist,
    createFromTemplate,
    updateItemStatus,
    linkProduct,
    unlinkProduct,
    updateItemNote,
    addCustomItem,
    removeItem,
    deleteChecklist,
    resetChecklist,
    getStats,
    getCurrentSeason,
  }
}
