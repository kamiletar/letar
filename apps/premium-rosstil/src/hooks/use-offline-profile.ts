'use client'

import type { Gender } from '@/generated/prisma'
import { get, set } from 'idb-keyval'
import { useCallback, useEffect, useRef, useState } from 'react'

const IDB_KEY = 'OFFLINE_PROFILE'
const AUTOSAVE_DELAY = 30000 // 30 секунд

/**
 * Структура данных профиля для оффлайн хранения
 */
export interface OfflineProfileData {
  // Личные данные
  personal: {
    name: string
    email: string
    phone: string
    birthDate: string
  }

  // Мерки тела (подробные)
  measurements: {
    gender?: Gender
    // Основные
    bust?: number
    waist?: number
    hips?: number
    height?: number
    // Дополнительные
    shoulderWidth?: number
    armLength?: number
    inseam?: number
    torsoLength?: number
    neckCircumference?: number
    thighCircumference?: number
    calfCircumference?: number
    ankleCircumference?: number
    // Предпочтения посадки
    fitPreference?: 'tight' | 'regular' | 'loose'
    preferredLength?: 'short' | 'regular' | 'long'
    preferredSize?: string
    notes?: string
  }

  // Стилевые предпочтения
  stylePreferences: {
    favoriteColors: string[]
    avoidColors: string[]
    favoriteStyles: string[]
    bodyType?: string
    colorType?: string
    lifestyle: string[]
  }

  // Адреса доставки
  addresses: Array<{
    id: string
    label: string
    fullAddress: string
    postalCode?: string
    city?: string
    isDefault: boolean
  }>

  // Метаданные
  updatedAt: string
  pendingSync: boolean // Требуется синхронизация с сервером
}

// Начальные значения
const DEFAULT_PROFILE: OfflineProfileData = {
  personal: { name: '', email: '', phone: '', birthDate: '' },
  measurements: {},
  stylePreferences: {
    favoriteColors: [],
    avoidColors: [],
    favoriteStyles: [],
    lifestyle: [],
  },
  addresses: [],
  updatedAt: new Date().toISOString(),
  pendingSync: false,
}

// Расчёт процента заполнения профиля
function calculateCompletionPercent(profile: OfflineProfileData): number {
  let filled = 0
  let total = 0

  // Личные данные (4 поля)
  total += 4
  if (profile.personal.name) {
    filled++
  }
  if (profile.personal.email) {
    filled++
  }
  if (profile.personal.phone) {
    filled++
  }
  if (profile.personal.birthDate) {
    filled++
  }

  // Основные мерки (5 полей)
  total += 5
  if (profile.measurements.gender) {
    filled++
  }
  if (profile.measurements.bust) {
    filled++
  }
  if (profile.measurements.waist) {
    filled++
  }
  if (profile.measurements.hips) {
    filled++
  }
  if (profile.measurements.height) {
    filled++
  }

  // Стилевые предпочтения (3 поля)
  total += 3
  if (profile.stylePreferences.favoriteColors.length > 0) {
    filled++
  }
  if (profile.stylePreferences.favoriteStyles.length > 0) {
    filled++
  }
  if (profile.stylePreferences.lifestyle.length > 0) {
    filled++
  }

  // Адрес (1 поле)
  total += 1
  if (profile.addresses.length > 0) {
    filled++
  }

  return Math.round((filled / total) * 100)
}

// Подсказки что ещё можно заполнить
function getMissingFields(profile: OfflineProfileData): string[] {
  const missing: string[] = []

  if (!profile.personal.name) {
    missing.push('Имя')
  }
  if (!profile.personal.phone) {
    missing.push('Телефон')
  }
  if (!profile.measurements.gender) {
    missing.push('Пол')
  }
  if (!profile.measurements.bust) {
    missing.push('Обхват груди')
  }
  if (!profile.measurements.waist) {
    missing.push('Обхват талии')
  }
  if (!profile.measurements.hips) {
    missing.push('Обхват бёдер')
  }
  if (profile.stylePreferences.favoriteColors.length === 0) {
    missing.push('Любимые цвета')
  }
  if (profile.addresses.length === 0) {
    missing.push('Адрес доставки')
  }

  return missing
}

// Экспорт для тестирования
export { calculateCompletionPercent, DEFAULT_PROFILE, getMissingFields }

/**
 * Хук для работы с профилем в оффлайн режиме.
 * Сохраняет данные в IndexedDB с автосохранением.
 */
export function useOfflineProfile() {
  const [profile, setProfile] = useState<OfflineProfileData>(DEFAULT_PROFILE)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Загрузка из IndexedDB при монтировании
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const stored = await get<OfflineProfileData>(IDB_KEY)
        if (stored) {
          setProfile(stored)
        }
      } catch (error) {
        console.error('Ошибка загрузки профиля из IndexedDB:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadProfile()
  }, [])

  // Сохранение в IndexedDB
  const saveToIndexedDB = useCallback(async (data: OfflineProfileData) => {
    setIsSaving(true)
    try {
      const updated = {
        ...data,
        updatedAt: new Date().toISOString(),
        pendingSync: true,
      }
      await set(IDB_KEY, updated)
      setProfile(updated)
      return { success: true }
    } catch (error) {
      console.error('Ошибка сохранения профиля в IndexedDB:', error)
      return { success: false, error }
    } finally {
      setIsSaving(false)
    }
  }, [])

  // Автосохранение с дебаунсом
  const scheduleAutosave = useCallback(
    (data: OfflineProfileData) => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
      autosaveTimerRef.current = setTimeout(() => {
        saveToIndexedDB(data)
      }, AUTOSAVE_DELAY)
    },
    [saveToIndexedDB]
  )

  // Обновление личных данных
  const updatePersonal = useCallback(
    (data: Partial<OfflineProfileData['personal']>) => {
      const updated = {
        ...profile,
        personal: { ...profile.personal, ...data },
      }
      setProfile(updated)
      scheduleAutosave(updated)
    },
    [profile, scheduleAutosave]
  )

  // Обновление мерок
  const updateMeasurements = useCallback(
    (data: Partial<OfflineProfileData['measurements']>) => {
      const updated = {
        ...profile,
        measurements: { ...profile.measurements, ...data },
      }
      setProfile(updated)
      scheduleAutosave(updated)
    },
    [profile, scheduleAutosave]
  )

  // Обновление стилевых предпочтений
  const updateStylePreferences = useCallback(
    (data: Partial<OfflineProfileData['stylePreferences']>) => {
      const updated = {
        ...profile,
        stylePreferences: { ...profile.stylePreferences, ...data },
      }
      setProfile(updated)
      scheduleAutosave(updated)
    },
    [profile, scheduleAutosave]
  )

  // Добавление адреса
  const addAddress = useCallback(
    (address: Omit<OfflineProfileData['addresses'][0], 'id'>) => {
      const newAddress = {
        ...address,
        id: crypto.randomUUID(),
      }
      const updated = {
        ...profile,
        addresses: [...profile.addresses, newAddress],
      }
      setProfile(updated)
      scheduleAutosave(updated)
    },
    [profile, scheduleAutosave]
  )

  // Удаление адреса
  const removeAddress = useCallback(
    (addressId: string) => {
      const updated = {
        ...profile,
        addresses: profile.addresses.filter((a) => a.id !== addressId),
      }
      setProfile(updated)
      scheduleAutosave(updated)
    },
    [profile, scheduleAutosave]
  )

  // Принудительное сохранение
  const saveNow = useCallback(async () => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }
    return saveToIndexedDB(profile)
  }, [profile, saveToIndexedDB])

  // Отметить как синхронизированный
  const markAsSynced = useCallback(async () => {
    const updated = { ...profile, pendingSync: false }
    await set(IDB_KEY, updated)
    setProfile(updated)
  }, [profile])

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
  }, [])

  const completionPercent = calculateCompletionPercent(profile)
  const missingFields = getMissingFields(profile)

  return {
    profile,
    isLoading,
    isSaving,
    completionPercent,
    missingFields,
    updatePersonal,
    updateMeasurements,
    updateStylePreferences,
    addAddress,
    removeAddress,
    saveNow,
    markAsSynced,
    pendingSync: profile.pendingSync,
  }
}
