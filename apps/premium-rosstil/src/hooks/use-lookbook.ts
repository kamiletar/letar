'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const IDB_KEY = 'LOOKBOOK_FAVORITES'

/**
 * Сезон лукбука
 */
export type LookbookSeason = 'SS25' | 'FW24' | 'SS24' | 'FW23'

/**
 * Случай для образа
 */
export type LookOccasion = 'everyday' | 'office' | 'evening' | 'weekend' | 'special' | 'vacation'

/**
 * Конфигурация сезонов
 */
export const SEASON_CONFIG: Record<LookbookSeason, { label: string; fullName: string }> = {
  SS25: { label: 'SS25', fullName: 'Весна-Лето 2025' },
  FW24: { label: 'FW24', fullName: 'Осень-Зима 2024' },
  SS24: { label: 'SS24', fullName: 'Весна-Лето 2024' },
  FW23: { label: 'FW23', fullName: 'Осень-Зима 2023' },
}

/**
 * Конфигурация случаев
 */
export const OCCASION_CONFIG: Record<LookOccasion, { label: string; emoji: string }> = {
  everyday: { label: 'На каждый день', emoji: '👕' },
  office: { label: 'В офис', emoji: '💼' },
  evening: { label: 'Вечерний выход', emoji: '✨' },
  weekend: { label: 'Выходной', emoji: '☕' },
  special: { label: 'Особый случай', emoji: '🎉' },
  vacation: { label: 'Отпуск', emoji: '🌴' },
}

/**
 * Товар в образе
 */
export interface LookProduct {
  id: string
  name: string
  price: number
  imageUrl: string
  category: string
}

/**
 * Образ (Look)
 */
export interface Look {
  id: string
  title: string
  description?: string
  imageUrl: string
  occasion: LookOccasion
  products: LookProduct[]
  stylistTip?: string
}

/**
 * Лукбук
 */
export interface Lookbook {
  id: string
  title: string
  description?: string
  coverImageUrl: string
  season: LookbookSeason
  looks: Look[]
}

/**
 * Демо-данные лукбуков
 */
export const DEMO_LOOKBOOKS: Lookbook[] = [
  {
    id: 'ss25-main',
    title: 'Весна 2025',
    description: 'Новая коллекция: свежие образы для яркого сезона',
    coverImageUrl: '/uploads/lookbook/ss25-cover.jpg',
    season: 'SS25',
    looks: [
      {
        id: 'ss25-1',
        title: 'Романтическая прогулка',
        description: 'Лёгкий и женственный образ для весенних прогулок',
        imageUrl: '/uploads/lookbook/ss25-look-1.jpg',
        occasion: 'weekend',
        stylistTip: 'Добавьте плетёную сумку и соломенную шляпу для завершённого образа',
        products: [
          {
            id: 'p1',
            name: 'Платье миди с цветочным принтом',
            price: 12900,
            imageUrl: '/uploads/products/dress-1.jpg',
            category: 'Платья',
          },
          {
            id: 'p2',
            name: 'Кардиган оверсайз',
            price: 8900,
            imageUrl: '/uploads/products/cardigan-1.jpg',
            category: 'Верхняя одежда',
          },
          {
            id: 'p3',
            name: 'Балетки кожаные',
            price: 6900,
            imageUrl: '/uploads/products/shoes-1.jpg',
            category: 'Обувь',
          },
        ],
      },
      {
        id: 'ss25-2',
        title: 'Деловой шик',
        description: 'Элегантный образ для важных встреч',
        imageUrl: '/uploads/lookbook/ss25-look-2.jpg',
        occasion: 'office',
        stylistTip: 'Классический костюм можно разбавить яркой блузой или аксессуарами',
        products: [
          {
            id: 'p4',
            name: 'Жакет приталенный',
            price: 15900,
            imageUrl: '/uploads/products/jacket-1.jpg',
            category: 'Верхняя одежда',
          },
          { id: 'p5', name: 'Брюки прямые', price: 9900, imageUrl: '/uploads/products/pants-1.jpg', category: 'Низ' },
          {
            id: 'p6',
            name: 'Блуза шёлковая',
            price: 11900,
            imageUrl: '/uploads/products/blouse-1.jpg',
            category: 'Верх',
          },
          {
            id: 'p7',
            name: 'Лодочки классические',
            price: 8900,
            imageUrl: '/uploads/products/heels-1.jpg',
            category: 'Обувь',
          },
        ],
      },
      {
        id: 'ss25-3',
        title: 'Вечерний выход',
        description: 'Роскошный образ для особых случаев',
        imageUrl: '/uploads/lookbook/ss25-look-3.jpg',
        occasion: 'evening',
        stylistTip: 'Минималистичные украшения подчеркнут элегантность платья',
        products: [
          {
            id: 'p8',
            name: 'Платье вечернее',
            price: 24900,
            imageUrl: '/uploads/products/dress-evening-1.jpg',
            category: 'Платья',
          },
          {
            id: 'p9',
            name: 'Клатч атласный',
            price: 7900,
            imageUrl: '/uploads/products/clutch-1.jpg',
            category: 'Сумки',
          },
          {
            id: 'p10',
            name: 'Босоножки на каблуке',
            price: 12900,
            imageUrl: '/uploads/products/sandals-1.jpg',
            category: 'Обувь',
          },
        ],
      },
    ],
  },
  {
    id: 'fw24-main',
    title: 'Осень-Зима 2024',
    description: 'Тёплые образы для холодного сезона',
    coverImageUrl: '/uploads/lookbook/fw24-cover.jpg',
    season: 'FW24',
    looks: [
      {
        id: 'fw24-1',
        title: 'Уютный кэжуал',
        description: 'Комфортный образ для осенних будней',
        imageUrl: '/uploads/lookbook/fw24-look-1.jpg',
        occasion: 'everyday',
        stylistTip: 'Многослойность — ключ к стильному осеннему образу',
        products: [
          {
            id: 'p11',
            name: 'Свитер объёмный',
            price: 10900,
            imageUrl: '/uploads/products/sweater-1.jpg',
            category: 'Верх',
          },
          { id: 'p12', name: 'Джинсы прямые', price: 8900, imageUrl: '/uploads/products/jeans-1.jpg', category: 'Низ' },
          {
            id: 'p13',
            name: 'Ботинки челси',
            price: 14900,
            imageUrl: '/uploads/products/boots-1.jpg',
            category: 'Обувь',
          },
          {
            id: 'p14',
            name: 'Шарф кашемировый',
            price: 6900,
            imageUrl: '/uploads/products/scarf-1.jpg',
            category: 'Аксессуары',
          },
        ],
      },
      {
        id: 'fw24-2',
        title: 'Городская элегантность',
        description: 'Стильный образ для прохладных дней',
        imageUrl: '/uploads/lookbook/fw24-look-2.jpg',
        occasion: 'office',
        stylistTip: 'Пальто классического кроя никогда не выйдет из моды',
        products: [
          {
            id: 'p15',
            name: 'Пальто шерстяное',
            price: 29900,
            imageUrl: '/uploads/products/coat-1.jpg',
            category: 'Верхняя одежда',
          },
          {
            id: 'p16',
            name: 'Водолазка кашемир',
            price: 12900,
            imageUrl: '/uploads/products/turtleneck-1.jpg',
            category: 'Верх',
          },
          { id: 'p17', name: 'Юбка-карандаш', price: 7900, imageUrl: '/uploads/products/skirt-1.jpg', category: 'Низ' },
          {
            id: 'p18',
            name: 'Ботильоны кожаные',
            price: 16900,
            imageUrl: '/uploads/products/ankle-boots-1.jpg',
            category: 'Обувь',
          },
        ],
      },
      {
        id: 'fw24-3',
        title: 'Праздничный образ',
        description: 'Нарядный look для зимних праздников',
        imageUrl: '/uploads/lookbook/fw24-look-3.jpg',
        occasion: 'special',
        stylistTip: 'Бархат и блеск — идеальное сочетание для праздничного сезона',
        products: [
          {
            id: 'p19',
            name: 'Платье бархатное',
            price: 18900,
            imageUrl: '/uploads/products/velvet-dress-1.jpg',
            category: 'Платья',
          },
          {
            id: 'p20',
            name: 'Жакет с пайетками',
            price: 14900,
            imageUrl: '/uploads/products/sequin-jacket-1.jpg',
            category: 'Верхняя одежда',
          },
          {
            id: 'p21',
            name: 'Туфли с блеском',
            price: 11900,
            imageUrl: '/uploads/products/glitter-shoes-1.jpg',
            category: 'Обувь',
          },
        ],
      },
    ],
  },
]

/**
 * Состояние избранных образов
 */
interface FavoritesState {
  lookIds: string[]
  version: number
}

const DEFAULT_FAVORITES: FavoritesState = { lookIds: [], version: 0 }

// Глобальное состояние для синхронизации между вкладками
let favoritesState: FavoritesState = DEFAULT_FAVORITES
const listeners = new Set<() => void>()

// Функции для тестирования
export function __resetLookbookState() {
  favoritesState = { ...DEFAULT_FAVORITES, version: 0 }
  listeners.clear()
}

export function __setLookbookFavorites(lookIds: string[]) {
  favoritesState = { lookIds, version: favoritesState.version + 1 }
  listeners.forEach((l) => l())
}

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
  return favoritesState
}

function getServerSnapshot(): FavoritesState {
  return DEFAULT_FAVORITES
}

/**
 * Хук для работы с лукбуками и образами.
 * Сохраняет избранное в IndexedDB для оффлайн доступа.
 */
export function useLookbook() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при первом рендере
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = await get<string[]>(IDB_KEY)
        if (stored) {
          favoritesState = { lookIds: stored, version: favoritesState.version + 1 }
          notifyListeners()
        }
      } catch (error) {
        console.error('Ошибка загрузки избранных образов:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadFavorites()
  }, [])

  // Сохранение в IndexedDB
  const saveToIDB = useCallback(async (lookIds: string[]) => {
    try {
      await set(IDB_KEY, lookIds)
    } catch (error) {
      console.error('Ошибка сохранения избранных образов:', error)
    }
  }, [])

  // Получить все лукбуки
  const getLookbooks = useCallback(() => {
    return DEMO_LOOKBOOKS
  }, [])

  // Получить лукбук по ID
  const getLookbook = useCallback((id: string) => {
    return DEMO_LOOKBOOKS.find((lb) => lb.id === id)
  }, [])

  // Получить образ по ID
  const getLook = useCallback((lookId: string) => {
    for (const lookbook of DEMO_LOOKBOOKS) {
      const look = lookbook.looks.find((l) => l.id === lookId)
      if (look) {
        return { look, lookbook }
      }
    }
    return null
  }, [])

  // Получить лукбуки по сезону
  const getLookbooksBySeason = useCallback((season: LookbookSeason) => {
    return DEMO_LOOKBOOKS.filter((lb) => lb.season === season)
  }, [])

  // Получить образы по случаю
  const getLooksByOccasion = useCallback((occasion: LookOccasion) => {
    const looks: (Look & { lookbookId: string })[] = []
    for (const lookbook of DEMO_LOOKBOOKS) {
      for (const look of lookbook.looks) {
        if (look.occasion === occasion) {
          looks.push({ ...look, lookbookId: lookbook.id })
        }
      }
    }
    return looks
  }, [])

  // Добавить образ в избранное
  const addToFavorites = useCallback(
    async (lookId: string) => {
      if (state.lookIds.includes(lookId)) {
        return { success: false, error: 'Образ уже в избранном' }
      }

      const updated = [...state.lookIds, lookId]
      favoritesState = { lookIds: updated, version: favoritesState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.lookIds, saveToIDB]
  )

  // Удалить образ из избранного
  const removeFromFavorites = useCallback(
    async (lookId: string) => {
      const updated = state.lookIds.filter((id) => id !== lookId)
      favoritesState = { lookIds: updated, version: favoritesState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.lookIds, saveToIDB]
  )

  // Переключить избранное
  const toggleFavorite = useCallback(
    async (lookId: string) => {
      if (state.lookIds.includes(lookId)) {
        return removeFromFavorites(lookId)
      }
      return addToFavorites(lookId)
    },
    [state.lookIds, addToFavorites, removeFromFavorites]
  )

  // Проверить, в избранном ли образ
  const isFavorite = useCallback(
    (lookId: string) => {
      return state.lookIds.includes(lookId)
    },
    [state.lookIds]
  )

  // Получить избранные образы
  const getFavoriteLooks = useCallback(() => {
    const looks: (Look & { lookbookId: string; lookbookTitle: string })[] = []
    for (const lookbook of DEMO_LOOKBOOKS) {
      for (const look of lookbook.looks) {
        if (state.lookIds.includes(look.id)) {
          looks.push({ ...look, lookbookId: lookbook.id, lookbookTitle: lookbook.title })
        }
      }
    }
    return looks
  }, [state.lookIds])

  // Подсчитать общую стоимость образа
  const calculateLookTotal = useCallback((look: Look) => {
    return look.products.reduce((sum, p) => sum + p.price, 0)
  }, [])

  // Все уникальные сезоны
  const availableSeasons = [...new Set(DEMO_LOOKBOOKS.map((lb) => lb.season))] as LookbookSeason[]

  // Все уникальные случаи
  const availableOccasions = [
    ...new Set(DEMO_LOOKBOOKS.flatMap((lb) => lb.looks.map((l) => l.occasion))),
  ] as LookOccasion[]

  return {
    lookbooks: DEMO_LOOKBOOKS,
    isLoading,
    getLookbooks,
    getLookbook,
    getLook,
    getLookbooksBySeason,
    getLooksByOccasion,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    getFavoriteLooks,
    calculateLookTotal,
    favoritesCount: state.lookIds.length,
    availableSeasons,
    availableOccasions,
  }
}
