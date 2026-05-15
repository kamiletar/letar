'use client'

import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useState } from 'react'

const IDB_KEY = 'STYLIST_QUESTIONNAIRE'

/**
 * Данные об образе жизни
 */
export interface LifestyleData {
  occupation: string // Профессия
  workDressCode: string // Дресс-код на работе
  hobbies: string[] // Хобби
  socialEvents: string[] // Какие мероприятия посещаете
  travelFrequency: string // Как часто путешествуете
}

/**
 * Данные о гардеробе
 */
export interface WardrobeData {
  currentSize: string // Текущий размер
  favoriteItems: string[] // Любимые вещи в гардеробе
  missingItems: string[] // Чего не хватает
  clothingBudget: string // Бюджет на одежду в месяц
  shoppingFrequency: string // Как часто покупаете
}

/**
 * Предпочтения стиля
 */
export interface StylePreferences {
  colorPreferences: string[] // Любимые цвета
  fabricPreferences: string[] // Любимые ткани
  printPreferences: string[] // Принты
  fitPreference: string // Посадка (облегающее, свободное)
  lengthPreference: string // Длина (мини, миди, макси)
}

/**
 * Проблемные зоны и особенности
 */
export interface ConcernsData {
  bodyAreas: string[] // Что хотите скрыть/подчеркнуть
  fitIssues: string[] // Проблемы с посадкой
  allergies: string[] // Аллергия на материалы
}

/**
 * Источники вдохновения
 */
export interface InspirationData {
  styleIcons: string[] // Иконы стиля
  instagramAccounts: string[] // Любимые аккаунты
  pinterestBoards: string[] // Доски Pinterest
  notes: string // Дополнительные заметки
}

/**
 * Полная анкета стилиста
 */
export interface StylistQuestionnaire {
  id: string
  lifestyle: LifestyleData
  wardrobe: WardrobeData
  preferences: StylePreferences
  concerns: ConcernsData
  inspiration: InspirationData
  currentStep: number
  completedAt?: string
  updatedAt: string
  createdAt: string
}

// Начальные данные
const initialLifestyle: LifestyleData = {
  occupation: '',
  workDressCode: '',
  hobbies: [],
  socialEvents: [],
  travelFrequency: '',
}

const initialWardrobe: WardrobeData = {
  currentSize: '',
  favoriteItems: [],
  missingItems: [],
  clothingBudget: '',
  shoppingFrequency: '',
}

const initialPreferences: StylePreferences = {
  colorPreferences: [],
  fabricPreferences: [],
  printPreferences: [],
  fitPreference: '',
  lengthPreference: '',
}

const initialConcerns: ConcernsData = {
  bodyAreas: [],
  fitIssues: [],
  allergies: [],
}

const initialInspiration: InspirationData = {
  styleIcons: [],
  instagramAccounts: [],
  pinterestBoards: [],
  notes: '',
}

// Опции для выбора
export const DRESS_CODE_OPTIONS = [
  'Офис (формальный)',
  'Офис (smart casual)',
  'Свободный стиль',
  'Удалённая работа',
  'Творческая профессия',
  'Без дресс-кода',
]

export const HOBBY_OPTIONS = [
  'Фитнес/спорт',
  'Йога/пилатес',
  'Танцы',
  'Путешествия',
  'Искусство',
  'Музыка',
  'Кулинария',
  'Чтение',
  'Садоводство',
  'Активный отдых',
]

export const EVENT_OPTIONS = [
  'Деловые встречи',
  'Вечеринки',
  'Концерты/театр',
  'Свадьбы/торжества',
  'Ресторан',
  'Спортивные мероприятия',
  'Выставки/галереи',
]

export const TRAVEL_OPTIONS = ['Редко', 'Несколько раз в год', 'Каждый месяц', 'Постоянно в разъездах']

export const SIZE_OPTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

export const WARDROBE_ITEM_OPTIONS = [
  'Платья',
  'Юбки',
  'Брюки',
  'Джинсы',
  'Блузы',
  'Футболки',
  'Пиджаки',
  'Пальто',
  'Куртки',
  'Свитеры',
  'Костюмы',
  'Аксессуары',
]

export const BUDGET_OPTIONS = [
  'До 10 000 ₽',
  '10 000 - 30 000 ₽',
  '30 000 - 70 000 ₽',
  '70 000 - 150 000 ₽',
  '150 000+ ₽',
]

export const SHOPPING_FREQUENCY_OPTIONS = [
  'Раз в неделю',
  'Несколько раз в месяц',
  'Раз в месяц',
  'Раз в сезон',
  'Несколько раз в год',
  'Крайне редко',
]

export const COLOR_OPTIONS = [
  'Чёрный',
  'Белый',
  'Серый',
  'Бежевый',
  'Коричневый',
  'Синий',
  'Голубой',
  'Зелёный',
  'Красный',
  'Розовый',
  'Фиолетовый',
  'Жёлтый',
  'Оранжевый',
  'Золотой',
]

export const FABRIC_OPTIONS = [
  'Хлопок',
  'Лён',
  'Шёлк',
  'Шерсть',
  'Кашемир',
  'Деним',
  'Трикотаж',
  'Кожа',
  'Бархат',
  'Атлас',
  'Вискоза',
]

export const PRINT_OPTIONS = [
  'Однотонные',
  'Полоска',
  'Клетка',
  'Горох',
  'Цветочный',
  'Геометрия',
  'Анималистичный',
  'Абстракция',
]

export const FIT_OPTIONS = ['Облегающий', 'Полуприлегающий', 'Свободный', 'Оверсайз']

export const LENGTH_OPTIONS = ['Мини', 'До колена', 'Миди', 'Ниже колена', 'Макси']

export const BODY_AREA_OPTIONS = [
  'Скрыть живот',
  'Скрыть бёдра',
  'Скрыть руки',
  'Подчеркнуть талию',
  'Подчеркнуть ноги',
  'Подчеркнуть грудь',
  'Удлинить силуэт',
  'Добавить объём',
]

export const FIT_ISSUE_OPTIONS = [
  'Короткие рукава',
  'Длинные рукава',
  'Узко в бёдрах',
  'Узко в плечах',
  'Длина не подходит',
  'Неудобная посадка',
]

export const ALLERGY_OPTIONS = ['Шерсть', 'Синтетика', 'Никель (в молниях)', 'Латекс', 'Нет аллергии']

// Количество шагов анкеты
export const TOTAL_STEPS = 5

/**
 * Хук для управления анкетой стилиста.
 * Сохраняет прогресс в IndexedDB для оффлайн доступа.
 */
export function useStylistQuestionnaire() {
  const [questionnaire, setQuestionnaire] = useState<StylistQuestionnaire | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Загрузка из IndexedDB
  useEffect(() => {
    const loadQuestionnaire = async () => {
      try {
        const stored = await get<StylistQuestionnaire>(IDB_KEY)
        if (stored) {
          setQuestionnaire(stored)
        }
      } catch (error) {
        console.error('Ошибка загрузки анкеты:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadQuestionnaire()
  }, [])

  // Сохранение в IndexedDB
  const saveQuestionnaire = useCallback(async (data: StylistQuestionnaire) => {
    try {
      await set(IDB_KEY, data)
      setQuestionnaire(data)
      return { success: true }
    } catch (error) {
      console.error('Ошибка сохранения анкеты:', error)
      return { success: false, error }
    }
  }, [])

  // Начать новую анкету
  const startQuestionnaire = useCallback(async () => {
    const now = new Date().toISOString()
    const newQuestionnaire: StylistQuestionnaire = {
      id: crypto.randomUUID(),
      lifestyle: initialLifestyle,
      wardrobe: initialWardrobe,
      preferences: initialPreferences,
      concerns: initialConcerns,
      inspiration: initialInspiration,
      currentStep: 1,
      createdAt: now,
      updatedAt: now,
    }
    return saveQuestionnaire(newQuestionnaire)
  }, [saveQuestionnaire])

  // Обновить раздел образ жизни
  const updateLifestyle = useCallback(
    async (data: Partial<LifestyleData>) => {
      if (!questionnaire) {
        return { success: false, error: 'Анкета не найдена' }
      }
      const updated: StylistQuestionnaire = {
        ...questionnaire,
        lifestyle: { ...questionnaire.lifestyle, ...data },
        updatedAt: new Date().toISOString(),
      }
      return saveQuestionnaire(updated)
    },
    [questionnaire, saveQuestionnaire]
  )

  // Обновить раздел гардероб
  const updateWardrobe = useCallback(
    async (data: Partial<WardrobeData>) => {
      if (!questionnaire) {
        return { success: false, error: 'Анкета не найдена' }
      }
      const updated: StylistQuestionnaire = {
        ...questionnaire,
        wardrobe: { ...questionnaire.wardrobe, ...data },
        updatedAt: new Date().toISOString(),
      }
      return saveQuestionnaire(updated)
    },
    [questionnaire, saveQuestionnaire]
  )

  // Обновить предпочтения
  const updatePreferences = useCallback(
    async (data: Partial<StylePreferences>) => {
      if (!questionnaire) {
        return { success: false, error: 'Анкета не найдена' }
      }
      const updated: StylistQuestionnaire = {
        ...questionnaire,
        preferences: { ...questionnaire.preferences, ...data },
        updatedAt: new Date().toISOString(),
      }
      return saveQuestionnaire(updated)
    },
    [questionnaire, saveQuestionnaire]
  )

  // Обновить проблемные зоны
  const updateConcerns = useCallback(
    async (data: Partial<ConcernsData>) => {
      if (!questionnaire) {
        return { success: false, error: 'Анкета не найдена' }
      }
      const updated: StylistQuestionnaire = {
        ...questionnaire,
        concerns: { ...questionnaire.concerns, ...data },
        updatedAt: new Date().toISOString(),
      }
      return saveQuestionnaire(updated)
    },
    [questionnaire, saveQuestionnaire]
  )

  // Обновить вдохновение
  const updateInspiration = useCallback(
    async (data: Partial<InspirationData>) => {
      if (!questionnaire) {
        return { success: false, error: 'Анкета не найдена' }
      }
      const updated: StylistQuestionnaire = {
        ...questionnaire,
        inspiration: { ...questionnaire.inspiration, ...data },
        updatedAt: new Date().toISOString(),
      }
      return saveQuestionnaire(updated)
    },
    [questionnaire, saveQuestionnaire]
  )

  // Перейти к шагу
  const goToStep = useCallback(
    async (step: number) => {
      if (!questionnaire) {
        return { success: false, error: 'Анкета не найдена' }
      }
      if (step < 1 || step > TOTAL_STEPS) {
        return { success: false, error: 'Неверный номер шага' }
      }
      const updated: StylistQuestionnaire = {
        ...questionnaire,
        currentStep: step,
        updatedAt: new Date().toISOString(),
      }
      return saveQuestionnaire(updated)
    },
    [questionnaire, saveQuestionnaire]
  )

  // Следующий шаг
  const nextStep = useCallback(async () => {
    if (!questionnaire) {
      return { success: false, error: 'Анкета не найдена' }
    }
    if (questionnaire.currentStep >= TOTAL_STEPS) {
      return { success: false, error: 'Достигнут последний шаг' }
    }
    return goToStep(questionnaire.currentStep + 1)
  }, [questionnaire, goToStep])

  // Предыдущий шаг
  const prevStep = useCallback(async () => {
    if (!questionnaire) {
      return { success: false, error: 'Анкета не найдена' }
    }
    if (questionnaire.currentStep <= 1) {
      return { success: false, error: 'Достигнут первый шаг' }
    }
    return goToStep(questionnaire.currentStep - 1)
  }, [questionnaire, goToStep])

  // Завершить анкету
  const completeQuestionnaire = useCallback(async () => {
    if (!questionnaire) {
      return { success: false, error: 'Анкета не найдена' }
    }
    const updated: StylistQuestionnaire = {
      ...questionnaire,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    return saveQuestionnaire(updated)
  }, [questionnaire, saveQuestionnaire])

  // Сбросить анкету
  const resetQuestionnaire = useCallback(async () => {
    try {
      await set(IDB_KEY, null)
      setQuestionnaire(null)
      return { success: true }
    } catch (error) {
      console.error('Ошибка сброса анкеты:', error)
      return { success: false, error }
    }
  }, [])

  // Расчёт процента заполнения
  const calculateProgress = useCallback(() => {
    if (!questionnaire) {
      return 0
    }

    let filled = 0
    let total = 0

    // Образ жизни (5 полей)
    total += 5
    if (questionnaire.lifestyle.occupation) {
      filled++
    }
    if (questionnaire.lifestyle.workDressCode) {
      filled++
    }
    if (questionnaire.lifestyle.hobbies.length > 0) {
      filled++
    }
    if (questionnaire.lifestyle.socialEvents.length > 0) {
      filled++
    }
    if (questionnaire.lifestyle.travelFrequency) {
      filled++
    }

    // Гардероб (5 полей)
    total += 5
    if (questionnaire.wardrobe.currentSize) {
      filled++
    }
    if (questionnaire.wardrobe.favoriteItems.length > 0) {
      filled++
    }
    if (questionnaire.wardrobe.missingItems.length > 0) {
      filled++
    }
    if (questionnaire.wardrobe.clothingBudget) {
      filled++
    }
    if (questionnaire.wardrobe.shoppingFrequency) {
      filled++
    }

    // Предпочтения (5 полей)
    total += 5
    if (questionnaire.preferences.colorPreferences.length > 0) {
      filled++
    }
    if (questionnaire.preferences.fabricPreferences.length > 0) {
      filled++
    }
    if (questionnaire.preferences.printPreferences.length > 0) {
      filled++
    }
    if (questionnaire.preferences.fitPreference) {
      filled++
    }
    if (questionnaire.preferences.lengthPreference) {
      filled++
    }

    // Проблемные зоны (3 поля)
    total += 3
    if (questionnaire.concerns.bodyAreas.length > 0) {
      filled++
    }
    if (questionnaire.concerns.fitIssues.length > 0) {
      filled++
    }
    if (questionnaire.concerns.allergies.length > 0) {
      filled++
    }

    // Вдохновение (4 поля)
    total += 4
    if (questionnaire.inspiration.styleIcons.length > 0) {
      filled++
    }
    if (questionnaire.inspiration.instagramAccounts.length > 0) {
      filled++
    }
    if (questionnaire.inspiration.pinterestBoards.length > 0) {
      filled++
    }
    if (questionnaire.inspiration.notes) {
      filled++
    }

    return Math.round((filled / total) * 100)
  }, [questionnaire])

  return {
    questionnaire,
    isLoading,
    isStarted: !!questionnaire,
    isCompleted: !!questionnaire?.completedAt,
    currentStep: questionnaire?.currentStep || 0,
    progress: calculateProgress(),
    startQuestionnaire,
    updateLifestyle,
    updateWardrobe,
    updatePreferences,
    updateConcerns,
    updateInspiration,
    goToStep,
    nextStep,
    prevStep,
    completeQuestionnaire,
    resetQuestionnaire,
  }
}
