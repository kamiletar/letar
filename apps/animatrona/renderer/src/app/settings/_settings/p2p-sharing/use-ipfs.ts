'use client'

/**
 * Хук для управления IPFS нодой
 */

import { useCallback, useEffect, useState } from 'react'

import type { IpfsState } from './types'

export interface UseIpfsReturn {
  ipfs: IpfsState
  startIpfs: () => Promise<void>
  stopIpfs: () => Promise<void>
}

/**
 * Хук для управления IPFS
 */
export function useIpfs(): UseIpfsReturn {
  const [ipfs, setIpfs] = useState<IpfsState>({
    status: null,
    isLoading: true,
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
        const result = await api.status()
        if (result.success && result.data) {
          setIpfs((prev) => ({ ...prev, status: result.data!, isLoading: false }))
        } else {
          setIpfs((prev) => ({ ...prev, isLoading: false, error: result.error || null }))
        }
      } catch (error) {
        setIpfs((prev) => ({ ...prev, isLoading: false, error: String(error) }))
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

    const unsubStatus = api.onStatusChanged((status) => {
      setIpfs((prev) => ({ ...prev, status, isLoading: false }))
    })

    return () => {
      unsubStatus()
    }
  }, [])

  const startIpfs = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    setIpfs((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await api.start()
      if (!result.success) {
        setIpfs((prev) => ({ ...prev, isLoading: false, error: result.error || 'Ошибка запуска' }))
      }
      // Статус обновится через событие
    } catch (error) {
      setIpfs((prev) => ({ ...prev, isLoading: false, error: String(error) }))
    }
  }, [])

  const stopIpfs = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    setIpfs((prev) => ({ ...prev, isLoading: true, error: null }))
    try {
      const result = await api.stop()
      if (!result.success) {
        setIpfs((prev) => ({ ...prev, isLoading: false, error: result.error || 'Ошибка остановки' }))
      }
      // Статус обновится через событие
    } catch (error) {
      setIpfs((prev) => ({ ...prev, isLoading: false, error: String(error) }))
    }
  }, [])

  return { ipfs, startIpfs, stopIpfs }
}
