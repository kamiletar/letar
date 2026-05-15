'use client'

/**
 * Хук для управления настройками приложения
 */

import { useCallback, useEffect, useState } from 'react'

import { useFindManyEncodingProfile, useFindUniqueSettings, useUpsertSettings } from '@/lib/hooks'

import type { DefaultPaths, UpdateStatus } from './types'

/**
 * Хук для загрузки и управления настройками
 */
export function useSettings() {
  const [defaultPaths, setDefaultPaths] = useState<DefaultPaths | null>(null)
  const [appVersion, setAppVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({
    status: 'idle',
    updateInfo: null,
    downloadProgress: 0,
    error: null,
    downloadSpeed: 0,
    downloadEta: 0,
  })

  // Настройки из БД
  const { data: settings, isLoading } = useFindUniqueSettings({
    where: { id: 'default' },
  })

  const { mutate: upsertSettings } = useUpsertSettings()

  // Профили кодирования
  const {
    data: profiles,
    isLoading: isLoadingProfiles,
    refetch: refetchProfiles,
  } = useFindManyEncodingProfile({
    orderBy: [{ isBuiltIn: 'desc' }, { isDefault: 'desc' }, { name: 'asc' }],
  })

  // Загружаем дефолтные пути из Electron
  useEffect(() => {
    const loadDefaultPaths = async () => {
      const api = window.electronAPI
      if (!api) {
        return
      }

      // Используем Videos для обоих путей — более логично для медиабиблиотеки
      const videos = await api.app.getPath('videos')
      // Нормализуем слеши для Windows
      const videosNormalized = videos.replace(/\//g, '\\')

      setDefaultPaths({
        libraryPath: `${videosNormalized}\\Animatrona`,
        outputPath: `${videosNormalized}\\Animatrona`,
      })
    }

    loadDefaultPaths()
  }, [])

  // Загружаем версию приложения и статус обновлений
  useEffect(() => {
    const loadVersionAndUpdates = async () => {
      const api = window.electronAPI
      if (!api?.updater) {
        return
      }

      const [version, status] = await Promise.all([api.updater.getVersion(), api.updater.getStatus()])

      setAppVersion(version)
      setUpdateStatus(status)
    }

    loadVersionAndUpdates()

    // Подписываемся на изменения статуса обновлений
    const unsubscribe = window.electronAPI?.updater?.onStatusChange((status) => {
      setUpdateStatus(status)
    })

    return () => unsubscribe?.()
  }, [])

  // Синхронизируем настройки трея с main process при загрузке
  useEffect(() => {
    if (!settings) {
      return
    }

    // Отправляем текущие настройки в main process
    window.electronAPI?.tray.updateSettings({
      minimizeToTray: settings.minimizeToTray ?? true,
      closeToTray: settings.closeToTray ?? true,
      showTrayNotification: settings.showTrayNotification ?? true,
    })
  }, [settings])

  // Слушаем изменения настроек из контекстного меню трея
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const unsubscribe = api.tray.onSettingsChanged((newSettings) => {
      // Обновляем в БД через upsertSettings
      upsertSettings({
        create: {
          closeToTray: newSettings.closeToTray,
        },
        update: {
          closeToTray: newSettings.closeToTray,
        },
      })
    })

    return unsubscribe
  }, [upsertSettings])

  // Обработчики обновлений
  const handleCheckUpdates = useCallback(async () => {
    await window.electronAPI?.updater?.check()
  }, [])

  const handleDownloadUpdate = useCallback(async () => {
    await window.electronAPI?.updater?.download()
  }, [])

  const handleInstallUpdate = useCallback(async () => {
    await window.electronAPI?.updater?.install()
  }, [])

  // Сохранение отдельного поля настроек
  const handleSave = useCallback(
    (field: string, value: unknown) => {
      upsertSettings({
        create: { [field]: value },
        update: { [field]: value },
      })
    },
    [upsertSettings]
  )

  // Сохранение с обновлением трея
  const handleSaveWithTray = useCallback(
    (field: string, value: unknown) => {
      handleSave(field, value)
      window.electronAPI?.tray.updateSettings({ [field]: value })
    },
    [handleSave]
  )

  return {
    // Настройки
    settings,
    isLoading,
    defaultPaths,
    handleSave,
    handleSaveWithTray,

    // Обновления
    appVersion,
    updateStatus,
    handleCheckUpdates,
    handleDownloadUpdate,
    handleInstallUpdate,

    // Профили
    profiles,
    isLoadingProfiles,
    refetchProfiles,
  }
}

export type UseSettingsReturn = ReturnType<typeof useSettings>
