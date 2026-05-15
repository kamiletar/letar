'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

const IDB_KEY = 'OCCASION_OUTFITS'

/**
 * Тип события
 */
export type OccasionType =
  | 'wedding_guest'
  | 'job_interview'
  | 'first_date'
  | 'corporate'
  | 'beach_vacation'
  | 'business_meeting'
  | 'casual_dinner'
  | 'theater'

/**
 * Категория одежды для чеклиста
 */
export type OutfitCategory = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'bag' | 'accessories'

/**
 * Конфигурация категорий
 */
export const CATEGORY_CONFIG: Record<OutfitCategory, { label: string; emoji: string }> = {
  top: { label: 'Верх', emoji: '👚' },
  bottom: { label: 'Низ', emoji: '👖' },
  dress: { label: 'Платье/Комбинезон', emoji: '👗' },
  outerwear: { label: 'Верхняя одежда', emoji: '🧥' },
  shoes: { label: 'Обувь', emoji: '👠' },
  bag: { label: 'Сумка', emoji: '👜' },
  accessories: { label: 'Аксессуары', emoji: '💍' },
}

/**
 * Информация о событии
 */
export interface OccasionInfo {
  id: OccasionType
  name: string
  emoji: string
  description: string
  tips: string[]
  recommended: string[]
  avoid: string[]
  checklist: { category: OutfitCategory; required: boolean; suggestions: string[] }[]
}

/**
 * Конфигурация событий
 */
export const OCCASIONS: OccasionInfo[] = [
  {
    id: 'wedding_guest',
    name: 'Гостья на свадьбе',
    emoji: '💒',
    description: 'Элегантный и торжественный образ для важного дня',
    tips: [
      'Избегайте белого и слишком светлых оттенков — это цвет невесты',
      'Длина миди или макси предпочтительнее мини',
      'Учитывайте дресс-код: дневная свадьба более casual, вечерняя — нарядная',
      'Выбирайте удобную обувь — вам предстоит много танцевать',
      'Возьмите накидку или жакет на случай прохладного вечера',
    ],
    recommended: ['Платье-миди', 'Комплект с юбкой', 'Элегантный комбинезон', 'Коктейльное платье'],
    avoid: ['Белое платье', 'Слишком короткое', 'Джинсы', 'Слишком откровенное', 'Чёрный total look'],
    checklist: [
      { category: 'dress', required: true, suggestions: ['Платье миди', 'Платье макси', 'Комбинезон'] },
      { category: 'shoes', required: true, suggestions: ['Босоножки на каблуке', 'Туфли', 'Элегантные балетки'] },
      { category: 'bag', required: true, suggestions: ['Клатч', 'Мини-сумка'] },
      { category: 'accessories', required: false, suggestions: ['Серьги', 'Браслет', 'Накидка'] },
    ],
  },
  {
    id: 'job_interview',
    name: 'Собеседование',
    emoji: '💼',
    description: 'Профессиональный образ, внушающий доверие',
    tips: [
      'Выбирайте классические, сдержанные цвета: тёмно-синий, серый, бежевый',
      'Одежда должна быть чистой и выглаженной',
      'Минимум украшений и макияжа',
      'Изучите дресс-код компании заранее',
      'Лучше одеться чуть более формально, чем недостаточно',
    ],
    recommended: ['Блейзер', 'Брюки классические', 'Рубашка', 'Платье-футляр', 'Юбка-карандаш'],
    avoid: ['Яркие цвета', 'Глубокое декольте', 'Мини-юбка', 'Спортивная одежда', 'Много украшений'],
    checklist: [
      { category: 'top', required: true, suggestions: ['Блузка', 'Рубашка', 'Водолазка'] },
      { category: 'bottom', required: true, suggestions: ['Брюки классические', 'Юбка-карандаш'] },
      { category: 'outerwear', required: false, suggestions: ['Блейзер', 'Жакет'] },
      { category: 'shoes', required: true, suggestions: ['Туфли-лодочки', 'Лоферы'] },
      { category: 'bag', required: true, suggestions: ['Деловая сумка', 'Тоут'] },
    ],
  },
  {
    id: 'first_date',
    name: 'Первое свидание',
    emoji: '💕',
    description: 'Романтичный образ, подчёркивающий вашу индивидуальность',
    tips: [
      'Выбирайте одежду, в которой вам комфортно',
      'Подчеркните свои достоинства, но не переборщите',
      'Учитывайте место встречи: ресторан, прогулка, кино',
      'Добавьте один яркий акцент: украшение или аксессуар',
      'Избегайте новой обуви — она может натереть',
    ],
    recommended: ['Платье', 'Юбка с блузой', 'Джинсы с красивым топом', 'Романтичная блуза'],
    avoid: ['Слишком откровенное', 'Спортивное', 'Неудобная обувь', 'Много логотипов брендов'],
    checklist: [
      { category: 'dress', required: false, suggestions: ['Платье романтичное', 'Платье на запах'] },
      { category: 'top', required: false, suggestions: ['Блуза', 'Топ', 'Свитер нарядный'] },
      { category: 'bottom', required: false, suggestions: ['Юбка', 'Джинсы', 'Брюки'] },
      { category: 'shoes', required: true, suggestions: ['Туфли', 'Ботильоны', 'Кеды (casual)'] },
      { category: 'bag', required: true, suggestions: ['Сумка кросс-боди', 'Клатч'] },
      { category: 'accessories', required: false, suggestions: ['Серьги', 'Кулон', 'Браслет'] },
    ],
  },
  {
    id: 'corporate',
    name: 'Корпоратив',
    emoji: '🎉',
    description: 'Праздничный, но уместный для рабочего мероприятия образ',
    tips: [
      'Найдите баланс между праздничным и профессиональным',
      'Добавьте блеск или яркий акцент, но в меру',
      'Помните, что это всё ещё рабочее мероприятие',
      'Выбирайте удобную обувь для танцев',
      'Учитывайте тему вечеринки, если она есть',
    ],
    recommended: ['Коктейльное платье', 'Нарядная блуза с брюками', 'Комбинезон', 'Юбка с блеском'],
    avoid: ['Слишком откровенное', 'Повседневная одежда', 'Спортивное', 'Total black (если не дресс-код)'],
    checklist: [
      { category: 'dress', required: false, suggestions: ['Коктейльное платье', 'Платье с блеском'] },
      { category: 'top', required: false, suggestions: ['Нарядная блуза', 'Топ с пайетками'] },
      { category: 'bottom', required: false, suggestions: ['Брюки нарядные', 'Юбка'] },
      { category: 'shoes', required: true, suggestions: ['Туфли на каблуке', 'Нарядные босоножки'] },
      { category: 'bag', required: true, suggestions: ['Клатч', 'Мини-сумка'] },
      { category: 'accessories', required: false, suggestions: ['Яркие серьги', 'Браслет', 'Колье'] },
    ],
  },
  {
    id: 'beach_vacation',
    name: 'Пляжный отдых',
    emoji: '🏖️',
    description: 'Лёгкий и стильный образ для курорта',
    tips: [
      'Выбирайте натуральные дышащие ткани: лён, хлопок',
      'Не забудьте головной убор для защиты от солнца',
      'Пляжная накидка — must-have для перехода с пляжа в кафе',
      'Возьмите удобную обувь для прогулок',
      'Яркие цвета и принты отлично смотрятся на отдыхе',
    ],
    recommended: ['Сарафан', 'Льняные брюки', 'Шорты', 'Накидка пляжная', 'Соломенная шляпа'],
    avoid: ['Синтетика', 'Тёмные цвета', 'Тесная одежда', 'Каблуки'],
    checklist: [
      { category: 'dress', required: false, suggestions: ['Сарафан', 'Пляжное платье', 'Туника'] },
      { category: 'top', required: false, suggestions: ['Топ', 'Льняная рубашка', 'Кроп-топ'] },
      { category: 'bottom', required: false, suggestions: ['Шорты', 'Юбка лёгкая', 'Льняные брюки'] },
      { category: 'shoes', required: true, suggestions: ['Сандалии', 'Эспадрильи', 'Шлёпанцы'] },
      { category: 'bag', required: true, suggestions: ['Пляжная сумка', 'Плетёная сумка'] },
      { category: 'accessories', required: true, suggestions: ['Шляпа', 'Солнцезащитные очки', 'Парео'] },
    ],
  },
  {
    id: 'business_meeting',
    name: 'Деловая встреча',
    emoji: '🤝',
    description: 'Строгий профессиональный образ для важных переговоров',
    tips: [
      'Классика всегда в выигрыше: костюм, блуза, туфли',
      'Цвета: тёмно-синий, серый, чёрный, бордо',
      'Качественные материалы создают правильное впечатление',
      'Аккуратная причёска и минимальный макияж',
      'Дорогие аксессуары: часы, ручка, портфель',
    ],
    recommended: ['Костюм', 'Платье-футляр', 'Брюки со стрелками', 'Блейзер'],
    avoid: ['Яркие цвета', 'Принты', 'Открытая обувь', 'Много украшений'],
    checklist: [
      { category: 'top', required: true, suggestions: ['Блузка', 'Рубашка', 'Водолазка кашемир'] },
      { category: 'bottom', required: true, suggestions: ['Брюки классические', 'Юбка-карандаш'] },
      { category: 'outerwear', required: true, suggestions: ['Блейзер', 'Жакет', 'Пиджак'] },
      { category: 'shoes', required: true, suggestions: ['Туфли-лодочки', 'Лоферы кожаные'] },
      { category: 'bag', required: true, suggestions: ['Портфель', 'Тоут', 'Структурированная сумка'] },
    ],
  },
  {
    id: 'casual_dinner',
    name: 'Ужин в ресторане',
    emoji: '🍷',
    description: 'Элегантный casual для вечернего выхода',
    tips: [
      'Изучите дресс-код ресторана, если есть',
      'Добавьте нарядный акцент: украшение или интересный топ',
      'Тёмные джинсы могут быть уместны в casual-ресторанах',
      'Каблук добавит элегантности',
      'Возьмите накидку — в ресторанах бывает прохладно',
    ],
    recommended: ['Платье', 'Брюки с нарядным топом', 'Юбка миди', 'Элегантный комбинезон'],
    avoid: ['Спортивное', 'Слишком casual', 'Шорты', 'Кроссовки'],
    checklist: [
      { category: 'dress', required: false, suggestions: ['Платье элегантное', 'Платье на запах'] },
      { category: 'top', required: false, suggestions: ['Шёлковая блуза', 'Нарядный топ'] },
      { category: 'bottom', required: false, suggestions: ['Брюки', 'Юбка миди', 'Тёмные джинсы'] },
      { category: 'shoes', required: true, suggestions: ['Туфли', 'Ботильоны', 'Элегантные босоножки'] },
      { category: 'bag', required: true, suggestions: ['Клатч', 'Элегантная сумка'] },
      { category: 'accessories', required: false, suggestions: ['Серьги', 'Браслет', 'Накидка'] },
    ],
  },
  {
    id: 'theater',
    name: 'Театр / Концерт',
    emoji: '🎭',
    description: 'Культурный выход требует соответствующего образа',
    tips: [
      'Театр — место, где можно блеснуть нарядом',
      'Избегайте шуршащих тканей — они мешают во время представления',
      'Выбирайте удобную обувь для прогулки в антракте',
      'Классика и элегантность всегда уместны',
      'Вечерние представления требуют более нарядного образа',
    ],
    recommended: ['Платье нарядное', 'Костюм', 'Юбка с блузой', 'Брюки с жакетом'],
    avoid: ['Casual', 'Джинсы', 'Кроссовки', 'Слишком открытое'],
    checklist: [
      { category: 'dress', required: false, suggestions: ['Платье нарядное', 'Платье коктейльное'] },
      { category: 'top', required: false, suggestions: ['Блуза нарядная', 'Топ с украшением'] },
      { category: 'bottom', required: false, suggestions: ['Брюки классические', 'Юбка'] },
      { category: 'outerwear', required: false, suggestions: ['Жакет', 'Накидка', 'Болеро'] },
      { category: 'shoes', required: true, suggestions: ['Туфли', 'Ботильоны элегантные'] },
      { category: 'bag', required: true, suggestions: ['Клатч', 'Театральная сумочка'] },
      { category: 'accessories', required: false, suggestions: ['Украшения', 'Шаль'] },
    ],
  },
]

/**
 * Элемент чеклиста образа
 */
export interface OutfitChecklistItem {
  category: OutfitCategory
  filled: boolean
  productId?: string
  productName?: string
  note?: string
}

/**
 * Сохранённый образ на событие
 */
export interface SavedOccasionOutfit {
  id: string
  occasionId: OccasionType
  name: string
  checklist: OutfitChecklistItem[]
  notes?: string
  createdAt: string
  updatedAt: string
}

/**
 * Данные хранилища
 */
interface OccasionOutfitData {
  savedOutfits: SavedOccasionOutfit[]
  updatedAt: string
}

/**
 * Состояние
 */
interface OutfitState {
  data: OccasionOutfitData
  version: number
}

const DEFAULT_DATA: OccasionOutfitData = {
  savedOutfits: [],
  updatedAt: new Date().toISOString(),
}

// Глобальное состояние для синхронизации между вкладками
let outfitState: OutfitState = { data: DEFAULT_DATA, version: 0 }
const listeners = new Set<() => void>()

// Функции для тестирования
export function __resetOccasionOutfitState() {
  outfitState = { data: { ...DEFAULT_DATA, savedOutfits: [] }, version: 0 }
  listeners.clear()
}

export function __setOccasionOutfitState(savedOutfits: SavedOccasionOutfit[]) {
  outfitState = {
    data: { savedOutfits, updatedAt: new Date().toISOString() },
    version: outfitState.version + 1,
  }
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
  return outfitState
}

// Закэшированный серверный снэпшот (требуется для useSyncExternalStore)
const SERVER_SNAPSHOT: OutfitState = { data: DEFAULT_DATA, version: 0 }

function getServerSnapshot(): OutfitState {
  return SERVER_SNAPSHOT
}

/**
 * Генерация уникального ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Хук для управления образами на события.
 * Сохраняет данные в IndexedDB для оффлайн доступа.
 */
export function useOccasionOutfit() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB при первом рендере
  useEffect(() => {
    const loadData = async () => {
      try {
        const stored = await get<OccasionOutfitData>(IDB_KEY)
        if (stored) {
          outfitState = { data: stored, version: outfitState.version + 1 }
          notifyListeners()
        }
      } catch (error) {
        console.error('Ошибка загрузки образов:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Сохранение в IndexedDB
  const saveToIDB = useCallback(async (data: OccasionOutfitData) => {
    try {
      await set(IDB_KEY, data)
    } catch (error) {
      console.error('Ошибка сохранения образов:', error)
    }
  }, [])

  // Получить информацию о событии
  const getOccasion = useCallback((occasionId: OccasionType) => {
    return OCCASIONS.find((o) => o.id === occasionId)
  }, [])

  // Создать новый образ из чеклиста события
  const createOutfit = useCallback(
    async (occasionId: OccasionType, name: string) => {
      const occasion = OCCASIONS.find((o) => o.id === occasionId)
      if (!occasion) {
        return { success: false, error: 'Событие не найдено' }
      }

      const checklist: OutfitChecklistItem[] = occasion.checklist.map((item) => ({
        category: item.category,
        filled: false,
      }))

      const newOutfit: SavedOccasionOutfit = {
        id: generateId(),
        occasionId,
        name,
        checklist,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const updated: OccasionOutfitData = {
        savedOutfits: [...state.data.savedOutfits, newOutfit],
        updatedAt: new Date().toISOString(),
      }

      outfitState = { data: updated, version: outfitState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true, outfit: newOutfit }
    },
    [state.data.savedOutfits, saveToIDB]
  )

  // Получить образ по ID
  const getOutfit = useCallback(
    (outfitId: string) => {
      return state.data.savedOutfits.find((o) => o.id === outfitId)
    },
    [state.data.savedOutfits]
  )

  // Получить образы по событию
  const getOutfitsByOccasion = useCallback(
    (occasionId: OccasionType) => {
      return state.data.savedOutfits.filter((o) => o.occasionId === occasionId)
    },
    [state.data.savedOutfits]
  )

  // Обновить элемент чеклиста
  const updateChecklistItem = useCallback(
    async (outfitId: string, category: OutfitCategory, updates: Partial<OutfitChecklistItem>) => {
      const updated: OccasionOutfitData = {
        savedOutfits: state.data.savedOutfits.map((o) =>
          o.id === outfitId
            ? {
                ...o,
                checklist: o.checklist.map((item) => (item.category === category ? { ...item, ...updates } : item)),
                updatedAt: new Date().toISOString(),
              }
            : o
        ),
        updatedAt: new Date().toISOString(),
      }

      outfitState = { data: updated, version: outfitState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.savedOutfits, saveToIDB]
  )

  // Добавить заметки к образу
  const updateOutfitNotes = useCallback(
    async (outfitId: string, notes: string) => {
      const updated: OccasionOutfitData = {
        savedOutfits: state.data.savedOutfits.map((o) =>
          o.id === outfitId ? { ...o, notes, updatedAt: new Date().toISOString() } : o
        ),
        updatedAt: new Date().toISOString(),
      }

      outfitState = { data: updated, version: outfitState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.savedOutfits, saveToIDB]
  )

  // Переименовать образ
  const renameOutfit = useCallback(
    async (outfitId: string, name: string) => {
      const updated: OccasionOutfitData = {
        savedOutfits: state.data.savedOutfits.map((o) =>
          o.id === outfitId ? { ...o, name, updatedAt: new Date().toISOString() } : o
        ),
        updatedAt: new Date().toISOString(),
      }

      outfitState = { data: updated, version: outfitState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.savedOutfits, saveToIDB]
  )

  // Удалить образ
  const deleteOutfit = useCallback(
    async (outfitId: string) => {
      const updated: OccasionOutfitData = {
        savedOutfits: state.data.savedOutfits.filter((o) => o.id !== outfitId),
        updatedAt: new Date().toISOString(),
      }

      outfitState = { data: updated, version: outfitState.version + 1 }
      notifyListeners()
      await saveToIDB(updated)

      return { success: true }
    },
    [state.data.savedOutfits, saveToIDB]
  )

  // Подсчитать прогресс образа
  const getOutfitProgress = useCallback((outfit: SavedOccasionOutfit) => {
    const total = outfit.checklist.length
    const filled = outfit.checklist.filter((item) => item.filled).length
    return {
      total,
      filled,
      percent: total > 0 ? Math.round((filled / total) * 100) : 0,
    }
  }, [])

  return {
    occasions: OCCASIONS,
    savedOutfits: state.data.savedOutfits,
    isLoading,
    getOccasion,
    createOutfit,
    getOutfit,
    getOutfitsByOccasion,
    updateChecklistItem,
    updateOutfitNotes,
    renameOutfit,
    deleteOutfit,
    getOutfitProgress,
  }
}
