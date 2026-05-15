'use client'

/**
 * Хук для управления Remote Pinning (Pinata)
 */

import { useCallback, useEffect, useState } from 'react'

import type { PinataConfig, RemotePinOptions } from '../../../../../../shared/types/remote-pinning'

import type { RemotePinState } from './types'

export interface UseRemotePinReturn {
  remotePin: RemotePinState
  updatePinataConfig: (updates: Partial<PinataConfig>) => Promise<void>
  testPinataAuth: (jwt: string) => Promise<boolean>
  pinRemotely: (cid: string, options?: RemotePinOptions) => Promise<boolean>
  unpinRemotely: (cid: string) => Promise<boolean>
  refreshRemotePins: () => Promise<void>
  refreshRemoteStats: () => Promise<void>
}

/**
 * Хук для управления Remote Pinning
 */
export function useRemotePin(): UseRemotePinReturn {
  const [remotePin, setRemotePin] = useState<RemotePinState>({
    config: null,
    pins: [],
    stats: null,
    isLoading: true,
    isTestingAuth: false,
    error: null,
  })

  // Загрузка начального состояния
  useEffect(() => {
    const loadInitialState = async () => {
      const api = window.electronAPI?.ipfs
      if (!api) {
        return
      }

      try {
        // Сначала загружаем только конфиг
        const configResult = await api.remotePinGetConfig()
        const config = configResult.success ? configResult.data || null : null

        // Если Pinata не включена или нет JWT — не загружаем list/stats
        if (!config?.pinata?.enabled || !config?.pinata?.jwt) {
          setRemotePin((prev) => ({
            ...prev,
            config,
            pins: [],
            stats: null,
            isLoading: false,
          }))
          return
        }

        // Pinata включена — загружаем list и stats
        const [pinsResult, statsResult] = await Promise.all([api.remotePinList(), api.remotePinStats()])
        setRemotePin((prev) => ({
          ...prev,
          config,
          pins: pinsResult.success ? pinsResult.data || [] : [],
          stats: statsResult.success ? statsResult.data || null : null,
          isLoading: false,
        }))
      } catch (error) {
        setRemotePin((prev) => ({ ...prev, isLoading: false, error: String(error) }))
      }
    }

    void loadInitialState()
  }, [])

  // Подписка на события
  useEffect(() => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    const unsubRemotePinConfig = api.onRemotePinConfigUpdated((config) => {
      setRemotePin((prev) => ({ ...prev, config }))
    })

    const unsubRemotePinStarted = api.onRemotePinStarted((_job) => {
      // При запуске пина обновим список
      void api.remotePinList().then((res) => {
        if (res.success) {
          setRemotePin((prev) => ({ ...prev, pins: res.data || [] }))
        }
      })
    })

    const unsubRemotePinUnpinned = api.onRemotePinUnpinned(({ cid }) => {
      // Удалить из списка
      setRemotePin((prev) => ({
        ...prev,
        pins: prev.pins.filter((p) => p.cid !== cid),
      }))
    })

    return () => {
      unsubRemotePinConfig()
      unsubRemotePinStarted()
      unsubRemotePinUnpinned()
    }
  }, [])

  const updatePinataConfig = useCallback(async (updates: Partial<PinataConfig>) => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    try {
      const result = await api.remotePinUpdatePinataConfig(updates)
      if (result.success && result.data) {
        setRemotePin((prev) => ({ ...prev, config: result.data! }))
      }
    } catch (error) {
      setRemotePin((prev) => ({ ...prev, error: String(error) }))
    }
  }, [])

  const testPinataAuth = useCallback(async (jwt: string): Promise<boolean> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return false
    }

    setRemotePin((prev) => ({ ...prev, isTestingAuth: true, error: null }))
    try {
      const result = await api.remotePinTestAuth(jwt)
      setRemotePin((prev) => ({ ...prev, isTestingAuth: false }))
      return result.success && result.data?.valid === true
    } catch (error) {
      setRemotePin((prev) => ({ ...prev, isTestingAuth: false, error: String(error) }))
      return false
    }
  }, [])

  const pinRemotely = useCallback(async (cid: string, options?: RemotePinOptions): Promise<boolean> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return false
    }

    try {
      const result = await api.remotePinPin(cid, options)
      return result.success
    } catch (error) {
      setRemotePin((prev) => ({ ...prev, error: String(error) }))
      return false
    }
  }, [])

  const unpinRemotely = useCallback(async (cid: string): Promise<boolean> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return false
    }

    try {
      const result = await api.remotePinUnpin(cid)
      return result.success
    } catch (error) {
      setRemotePin((prev) => ({ ...prev, error: String(error) }))
      return false
    }
  }, [])

  const refreshRemotePins = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    // Проверяем, включена ли Pinata
    if (!remotePin.config?.pinata?.enabled || !remotePin.config?.pinata?.jwt) {
      return
    }

    setRemotePin((prev) => ({ ...prev, isLoading: true }))
    try {
      const result = await api.remotePinList()
      setRemotePin((prev) => ({
        ...prev,
        pins: result.success ? result.data || [] : [],
        isLoading: false,
      }))
    } catch (error) {
      setRemotePin((prev) => ({ ...prev, isLoading: false, error: String(error) }))
    }
  }, [remotePin.config?.pinata?.enabled, remotePin.config?.pinata?.jwt])

  const refreshRemoteStats = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    // Проверяем, включена ли Pinata
    if (!remotePin.config?.pinata?.enabled || !remotePin.config?.pinata?.jwt) {
      return
    }

    try {
      const result = await api.remotePinStats()
      if (result.success && result.data) {
        setRemotePin((prev) => ({ ...prev, stats: result.data! }))
      }
    } catch (error) {
      setRemotePin((prev) => ({ ...prev, error: String(error) }))
    }
  }, [remotePin.config?.pinata?.enabled, remotePin.config?.pinata?.jwt])

  return {
    remotePin,
    updatePinataConfig,
    testPinataAuth,
    pinRemotely,
    unpinRemotely,
    refreshRemotePins,
    refreshRemoteStats,
  }
}
