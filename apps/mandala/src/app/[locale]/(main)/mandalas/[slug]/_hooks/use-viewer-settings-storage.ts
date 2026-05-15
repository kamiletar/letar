'use client'

import { useCallback, useEffect, useState } from 'react'
import { defaultViewerSettings, type ViewerSettings, ViewerSettingsSchema } from '../_schemas/viewer-settings.schema'

const STORAGE_KEY = 'mandala-viewer-settings'

/**
 * Хук для сохранения настроек просмотра в localStorage.
 * Автоматически загружает настройки при монтировании и сохраняет при изменении.
 */
export function useViewerSettingsStorage(mandalaSlug: string, initialEffectIndex: number) {
  const [settings, setSettings] = useState<ViewerSettings>(() => ({
    ...defaultViewerSettings,
    effectIndex: initialEffectIndex,
  }))
  const [isLoaded, setIsLoaded] = useState(false)

  // Загрузка настроек из localStorage при монтировании
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        const validated = ViewerSettingsSchema.safeParse(parsed)
        if (validated.success) {
          // Используем сохранённые настройки, но effectIndex берём из мандалы
          // (пользователь может захотеть начать с дефолтного эффекта конкретной мандалы)
          setSettings({
            ...validated.data,
            effectIndex: initialEffectIndex,
          })
        }
      }
    } catch (e) {
      console.error('Ошибка загрузки настроек:', e)
    }
    setIsLoaded(true)
  }, [initialEffectIndex])

  // Сохранение настроек в localStorage при изменении
  useEffect(() => {
    if (!isLoaded) {
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch (e) {
      console.error('Ошибка сохранения настроек:', e)
    }
  }, [settings, isLoaded])

  // Обработчик изменения настроек
  const updateSettings = useCallback((newSettings: Partial<ViewerSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }))
  }, [])

  // Сброс настроек к значениям по умолчанию
  const resetSettings = useCallback(() => {
    setSettings({
      ...defaultViewerSettings,
      effectIndex: initialEffectIndex,
    })
    localStorage.removeItem(STORAGE_KEY)
  }, [initialEffectIndex])

  return {
    settings,
    updateSettings,
    resetSettings,
    isLoaded,
  }
}
