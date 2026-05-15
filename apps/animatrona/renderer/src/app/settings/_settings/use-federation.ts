'use client'

/**
 * Хук для работы с федерацией трекеров
 *
 * Предоставляет функции для:
 * - Управления настройками федерации
 * - Добавления/удаления трекеров
 * - Синхронизации контента
 * - Управления уровнями доверия
 */

import { useCallback, useEffect, useState } from 'react'

import type {
  AddTrackerOptions,
  DiscoverResult,
  FederationSettings,
  GlobalSeederStats,
  SyncOptions,
  SyncResult,
  TrackerInfo,
  TrustLevel,
} from '../../../../../shared/types/federation'

/**
 * Состояние настроек федерации
 */
interface SettingsState {
  data: FederationSettings | null
  isLoading: boolean
  error: string | null
}

/**
 * Состояние трекеров
 */
interface TrackersState {
  list: TrackerInfo[]
  isLoading: boolean
  error: string | null
}

/**
 * Состояние обнаружения трекера
 */
interface DiscoveryState {
  result: DiscoverResult | null
  isLoading: boolean
  error: string | null
}

/**
 * Состояние синхронизации
 */
interface SyncState {
  isSyncing: boolean
  syncingTrackerId: string | null
  lastResults: SyncResult[]
  error: string | null
}

/**
 * Хук для работы с федерацией
 */
export function useFederation() {
  // Настройки
  const [settings, setSettings] = useState<SettingsState>({
    data: null,
    isLoading: true,
    error: null,
  })

  // Трекеры
  const [trackers, setTrackers] = useState<TrackersState>({
    list: [],
    isLoading: true,
    error: null,
  })

  // Обнаружение
  const [discovery, setDiscovery] = useState<DiscoveryState>({
    result: null,
    isLoading: false,
    error: null,
  })

  // Синхронизация
  const [sync, setSync] = useState<SyncState>({
    isSyncing: false,
    syncingTrackerId: null,
    lastResults: [],
    error: null,
  })

  // Генерация ключей
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false)

  // ============================================================================
  // Загрузка данных
  // ============================================================================

  const loadSettings = useCallback(async () => {
    try {
      const result = await window.electronAPI?.federation.getSettings()
      if (!result) {
        setSettings({ data: null, isLoading: false, error: 'Electron API недоступен' })
        return
      }
      if (result.success && result.data) {
        setSettings({ data: result.data, isLoading: false, error: null })
      } else {
        setSettings({ data: null, isLoading: false, error: result.error ?? 'Ошибка загрузки настроек' })
      }
    } catch (error) {
      setSettings({ data: null, isLoading: false, error: (error as Error).message })
    }
  }, [])

  const loadTrackers = useCallback(async () => {
    try {
      setTrackers((prev) => ({ ...prev, isLoading: true }))
      const result = await window.electronAPI?.federation.listTrackers()
      if (!result) {
        setTrackers({ list: [], isLoading: false, error: 'Electron API недоступен' })
        return
      }
      if (result.success && result.data) {
        setTrackers({ list: result.data, isLoading: false, error: null })
      } else {
        setTrackers({ list: [], isLoading: false, error: result.error ?? 'Ошибка загрузки трекеров' })
      }
    } catch (error) {
      setTrackers({ list: [], isLoading: false, error: (error as Error).message })
    }
  }, [])

  // Загружаем данные при монтировании
  useEffect(() => {
    void loadSettings()
    void loadTrackers()
  }, [loadSettings, loadTrackers])

  // ============================================================================
  // Настройки
  // ============================================================================

  const updateSettings = useCallback(async (update: Partial<Omit<FederationSettings, 'hasPrivateKey'>>) => {
    try {
      const result = await window.electronAPI?.federation.updateSettings(update)
      if (!result) {
        return false
      }
      if (result.success && result.data) {
        setSettings((prev) => ({ ...prev, data: result.data ?? null }))
        return true
      }
      setSettings((prev) => ({ ...prev, error: result.error ?? 'Ошибка обновления настроек' }))
      return false
    } catch (error) {
      setSettings((prev) => ({ ...prev, error: (error as Error).message }))
      return false
    }
  }, [])

  const generateKeys = useCallback(async () => {
    setIsGeneratingKeys(true)
    try {
      const result = await window.electronAPI?.federation.generateKeys()
      if (!result) {
        return false
      }
      if (result.success) {
        await loadSettings()
        return true
      }
      setSettings((prev) => ({ ...prev, error: result.error ?? 'Ошибка генерации ключей' }))
      return false
    } catch (error) {
      setSettings((prev) => ({ ...prev, error: (error as Error).message }))
      return false
    } finally {
      setIsGeneratingKeys(false)
    }
  }, [loadSettings])

  // ============================================================================
  // Обнаружение трекеров
  // ============================================================================

  const discoverTracker = useCallback(async (url: string) => {
    setDiscovery({ result: null, isLoading: true, error: null })
    try {
      const result = await window.electronAPI?.federation.discover(url)
      if (!result) {
        setDiscovery({ result: null, isLoading: false, error: 'Electron API недоступен' })
        return null
      }
      if (result.success && result.data) {
        setDiscovery({ result: result.data, isLoading: false, error: null })
        return result.data
      }
      setDiscovery({ result: null, isLoading: false, error: result.error ?? 'Трекер не найден' })
      return null
    } catch (error) {
      setDiscovery({ result: null, isLoading: false, error: (error as Error).message })
      return null
    }
  }, [])

  const clearDiscovery = useCallback(() => {
    setDiscovery({ result: null, isLoading: false, error: null })
  }, [])

  // ============================================================================
  // Управление трекерами
  // ============================================================================

  const addTracker = useCallback(
    async (options: AddTrackerOptions) => {
      try {
        const result = await window.electronAPI?.federation.addTracker(options)
        if (!result) {
          return null
        }
        if (result.success && result.data) {
          await loadTrackers()
          return result.data
        }
        setTrackers((prev) => ({ ...prev, error: result.error ?? 'Ошибка добавления трекера' }))
        return null
      } catch (error) {
        setTrackers((prev) => ({ ...prev, error: (error as Error).message }))
        return null
      }
    },
    [loadTrackers]
  )

  const removeTracker = useCallback(
    async (trackerId: string) => {
      try {
        const result = await window.electronAPI?.federation.removeTracker(trackerId)
        if (!result) {
          return false
        }
        if (result.success) {
          await loadTrackers()
          return true
        }
        setTrackers((prev) => ({ ...prev, error: result.error ?? 'Ошибка удаления трекера' }))
        return false
      } catch (error) {
        setTrackers((prev) => ({ ...prev, error: (error as Error).message }))
        return false
      }
    },
    [loadTrackers]
  )

  const refreshTracker = useCallback(
    async (trackerId: string) => {
      try {
        const result = await window.electronAPI?.federation.refreshTracker(trackerId)
        if (!result) {
          return false
        }
        if (result.success) {
          await loadTrackers()
          return true
        }
        return false
      } catch {
        return false
      }
    },
    [loadTrackers]
  )

  const setTrustLevel = useCallback(
    async (trackerId: string, trustLevel: TrustLevel) => {
      try {
        const result = await window.electronAPI?.federation.setTrust(trackerId, trustLevel)
        if (!result) {
          return false
        }
        if (result.success) {
          await loadTrackers()
          return true
        }
        setTrackers((prev) => ({ ...prev, error: result.error ?? 'Ошибка установки уровня доверия' }))
        return false
      } catch (error) {
        setTrackers((prev) => ({ ...prev, error: (error as Error).message }))
        return false
      }
    },
    [loadTrackers]
  )

  const blockTracker = useCallback(
    async (trackerId: string) => {
      try {
        const result = await window.electronAPI?.federation.blockTracker(trackerId)
        if (!result) {
          return false
        }
        if (result.success) {
          await loadTrackers()
          return true
        }
        return false
      } catch {
        return false
      }
    },
    [loadTrackers]
  )

  const unblockTracker = useCallback(
    async (trackerId: string) => {
      try {
        const result = await window.electronAPI?.federation.unblockTracker(trackerId)
        if (!result) {
          return false
        }
        if (result.success) {
          await loadTrackers()
          return true
        }
        return false
      } catch {
        return false
      }
    },
    [loadTrackers]
  )

  // ============================================================================
  // Синхронизация
  // ============================================================================

  const syncTracker = useCallback(
    async (trackerId: string, options?: SyncOptions) => {
      setSync((prev) => ({ ...prev, isSyncing: true, syncingTrackerId: trackerId, error: null }))
      try {
        const result = await window.electronAPI?.federation.sync(trackerId, options)
        if (!result) {
          setSync((prev) => ({ ...prev, isSyncing: false, syncingTrackerId: null, error: 'Electron API недоступен' }))
          return null
        }
        if (result.success && result.data) {
          setSync((prev) => ({
            ...prev,
            isSyncing: false,
            syncingTrackerId: null,
            lastResults: [result.data!, ...prev.lastResults.slice(0, 9)],
          }))
          await loadTrackers()
          return result.data
        }
        setSync((prev) => ({
          ...prev,
          isSyncing: false,
          syncingTrackerId: null,
          error: result.error ?? 'Ошибка синхронизации',
        }))
        return null
      } catch (error) {
        setSync((prev) => ({
          ...prev,
          isSyncing: false,
          syncingTrackerId: null,
          error: (error as Error).message,
        }))
        return null
      }
    },
    [loadTrackers]
  )

  const syncAll = useCallback(
    async (options?: SyncOptions) => {
      setSync((prev) => ({ ...prev, isSyncing: true, syncingTrackerId: null, error: null }))
      try {
        const result = await window.electronAPI?.federation.syncAll(options)
        if (!result) {
          setSync((prev) => ({ ...prev, isSyncing: false, error: 'Electron API недоступен' }))
          return null
        }
        if (result.success && result.data) {
          setSync((prev) => ({
            ...prev,
            isSyncing: false,
            lastResults: result.data!,
          }))
          await loadTrackers()
          return result.data
        }
        setSync((prev) => ({
          ...prev,
          isSyncing: false,
          error: result.error ?? 'Ошибка синхронизации',
        }))
        return null
      } catch (error) {
        setSync((prev) => ({
          ...prev,
          isSyncing: false,
          error: (error as Error).message,
        }))
        return null
      }
    },
    [loadTrackers]
  )

  // ============================================================================
  // Сидеры
  // ============================================================================

  const getGlobalSeeders = useCallback(async (cid: string): Promise<GlobalSeederStats | null> => {
    try {
      const result = await window.electronAPI?.federation.getGlobalSeeders(cid)
      if (!result) {
        return null
      }
      if (result.success && result.data) {
        return result.data
      }
      return null
    } catch {
      return null
    }
  }, [])

  const getTrustScore = useCallback(async (trackerId: string): Promise<number | null> => {
    try {
      const result = await window.electronAPI?.federation.getTrustScore(trackerId)
      if (!result) {
        return null
      }
      if (result.success && result.data !== undefined) {
        return result.data
      }
      return null
    } catch {
      return null
    }
  }, [])

  return {
    // Настройки
    settings,
    updateSettings,
    generateKeys,
    isGeneratingKeys,

    // Трекеры
    trackers,
    loadTrackers,

    // Обнаружение
    discovery,
    discoverTracker,
    clearDiscovery,

    // Управление трекерами
    addTracker,
    removeTracker,
    refreshTracker,
    setTrustLevel,
    blockTracker,
    unblockTracker,

    // Синхронизация
    sync,
    syncTracker,
    syncAll,

    // Сидеры и репутация
    getGlobalSeeders,
    getTrustScore,
  }
}
