'use client'

/**
 * Хук для управления планировщиком автообновления
 */

import { useCallback, useEffect, useState } from 'react'

import type { SchedulerConfig, SubscriptionRefreshResult } from '../../../../../../shared/types/ipfs'

import type { SchedulerState } from './types'

export interface UseSchedulerReturn {
  scheduler: SchedulerState
  updateSchedulerConfig: (updates: Partial<SchedulerConfig>) => Promise<void>
  startScheduler: () => Promise<void>
  stopScheduler: () => Promise<void>
  checkNow: (
    setIsRefreshing: (value: boolean) => void,
    setRefreshResults: (results: SubscriptionRefreshResult[]) => void,
  ) => Promise<void>
}

/**
 * Хук для управления планировщиком
 */
export function useScheduler(onChecked?: (results: SubscriptionRefreshResult[]) => void): UseSchedulerReturn {
  const [scheduler, setScheduler] = useState<SchedulerState>({
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
        const result = await api.schedulerGetStatus()
        if (result.success && result.data) {
          setScheduler((prev) => ({ ...prev, status: result.data!, isLoading: false }))
        } else {
          setScheduler((prev) => ({ ...prev, isLoading: false, error: result.error || null }))
        }
      } catch (error) {
        setScheduler((prev) => ({ ...prev, isLoading: false, error: String(error) }))
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

    const unsubSchedulerStatus = api.onSchedulerStatusChanged((status) => {
      setScheduler((prev) => ({ ...prev, status }))
    })

    const unsubSchedulerConfig = api.onSchedulerConfigUpdated((config) => {
      setScheduler((prev) => ({
        ...prev,
        status: prev.status ? { ...prev.status, config } : null,
      }))
    })

    const unsubSchedulerChecked = api.onSchedulerChecked((results) => {
      onChecked?.(results)
    })

    return () => {
      unsubSchedulerStatus()
      unsubSchedulerConfig()
      unsubSchedulerChecked()
    }
  }, [onChecked])

  const updateSchedulerConfig = useCallback(async (updates: Partial<SchedulerConfig>) => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    try {
      const result = await api.schedulerUpdateConfig(updates)
      if (result.success && result.data) {
        setScheduler((prev) => ({
          ...prev,
          status: prev.status ? { ...prev.status, config: result.data! } : null,
        }))
      }
    } catch (error) {
      setScheduler((prev) => ({ ...prev, error: String(error) }))
    }
  }, [])

  const startScheduler = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    try {
      await api.schedulerStart()
    } catch (error) {
      setScheduler((prev) => ({ ...prev, error: String(error) }))
    }
  }, [])

  const stopScheduler = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    try {
      await api.schedulerStop()
    } catch (error) {
      setScheduler((prev) => ({ ...prev, error: String(error) }))
    }
  }, [])

  const checkNow = useCallback(
    async (
      setIsRefreshing: (value: boolean) => void,
      setRefreshResults: (results: SubscriptionRefreshResult[]) => void,
    ) => {
      const api = window.electronAPI?.ipfs
      if (!api) {
        return
      }

      setIsRefreshing(true)
      try {
        const result = await api.schedulerCheckNow()
        setRefreshResults(result.success ? result.data || [] : [])
      } catch (error) {
        setIsRefreshing(false)
        setScheduler((prev) => ({ ...prev, error: String(error) }))
      }
    },
    [],
  )

  return { scheduler, updateSchedulerConfig, startScheduler, stopScheduler, checkNow }
}
