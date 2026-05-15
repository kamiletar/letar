'use client'

/**
 * Хук для управления подписками
 */

import { useCallback, useEffect, useState } from 'react'

import type {
  Subscription,
  SubscriptionCreateData,
  SubscriptionRefreshResult,
} from '../../../../../../shared/types/ipfs'

import type { SubscriptionsState } from './types'

export interface UseSubscriptionsReturn {
  subscriptions: SubscriptionsState
  addSubscription: (data: SubscriptionCreateData) => Promise<Subscription | null>
  removeSubscription: (id: string) => Promise<boolean>
  updateSubscription: (
    id: string,
    data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit'>>
  ) => Promise<Subscription | null>
  refreshSubscription: (id: string) => Promise<SubscriptionRefreshResult | null>
  refreshAllSubscriptions: () => Promise<void>
  /** Сеттер для обновления isRefreshing из scheduler */
  setIsRefreshing: (value: boolean) => void
  /** Сеттер для обновления refreshResults из scheduler */
  setRefreshResults: (results: SubscriptionRefreshResult[]) => void
}

/**
 * Хук для управления подписками
 */
export function useSubscriptions(): UseSubscriptionsReturn {
  const [subscriptions, setSubscriptions] = useState<SubscriptionsState>({
    list: [],
    isLoading: true,
    isRefreshing: false,
    refreshResults: [],
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
        const result = await api.subscriptionList()
        if (result.success && result.data) {
          setSubscriptions((prev) => ({ ...prev, list: result.data!, isLoading: false }))
        } else {
          setSubscriptions((prev) => ({ ...prev, isLoading: false, error: result.error || null }))
        }
      } catch (error) {
        setSubscriptions((prev) => ({ ...prev, isLoading: false, error: String(error) }))
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

    const unsubSubAdded = api.onSubscriptionAdded((subscription) => {
      setSubscriptions((prev) => ({ ...prev, list: [...prev.list, subscription] }))
    })

    const unsubSubRemoved = api.onSubscriptionRemoved((subscription) => {
      setSubscriptions((prev) => ({
        ...prev,
        list: prev.list.filter((s) => s.id !== subscription.id),
      }))
    })

    const unsubSubUpdated = api.onSubscriptionUpdated((subscription) => {
      setSubscriptions((prev) => ({
        ...prev,
        list: prev.list.map((s) => (s.id === subscription.id ? subscription : s)),
      }))
    })

    const unsubSubRefreshed = api.onSubscriptionRefreshed((result) => {
      setSubscriptions((prev) => ({
        ...prev,
        list: prev.list.map((s) => (s.id === result.subscription.id ? result.subscription : s)),
      }))
    })

    return () => {
      unsubSubAdded()
      unsubSubRemoved()
      unsubSubUpdated()
      unsubSubRefreshed()
    }
  }, [])

  const addSubscription = useCallback(async (data: SubscriptionCreateData): Promise<Subscription | null> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return null
    }

    try {
      const result = await api.subscriptionAdd(data)
      if (result.success && result.data) {
        return result.data
      }
      setSubscriptions((prev) => ({ ...prev, error: result.error || 'Ошибка добавления' }))
      return null
    } catch (error) {
      setSubscriptions((prev) => ({ ...prev, error: String(error) }))
      return null
    }
  }, [])

  const removeSubscription = useCallback(async (id: string): Promise<boolean> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return false
    }

    try {
      const result = await api.subscriptionRemove(id)
      return result.success && result.data === true
    } catch (error) {
      setSubscriptions((prev) => ({ ...prev, error: String(error) }))
      return false
    }
  }, [])

  const updateSubscription = useCallback(
    async (
      id: string,
      data: Partial<Pick<Subscription, 'displayName' | 'autoPin' | 'autoPinLimit'>>
    ): Promise<Subscription | null> => {
      const api = window.electronAPI?.ipfs
      if (!api) {
        return null
      }

      try {
        const result = await api.subscriptionUpdate(id, data)
        if (result.success && result.data) {
          return result.data
        }
        return null
      } catch (error) {
        setSubscriptions((prev) => ({ ...prev, error: String(error) }))
        return null
      }
    },
    []
  )

  const refreshSubscription = useCallback(async (id: string): Promise<SubscriptionRefreshResult | null> => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return null
    }

    setSubscriptions((prev) => ({ ...prev, isRefreshing: true }))
    try {
      const result = await api.subscriptionRefresh(id)
      setSubscriptions((prev) => ({ ...prev, isRefreshing: false }))
      if (result.success && result.data) {
        return result.data
      }
      return null
    } catch (error) {
      setSubscriptions((prev) => ({ ...prev, isRefreshing: false, error: String(error) }))
      return null
    }
  }, [])

  const refreshAllSubscriptions = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    setSubscriptions((prev) => ({ ...prev, isRefreshing: true }))
    try {
      const result = await api.subscriptionRefreshAll()
      setSubscriptions((prev) => ({
        ...prev,
        isRefreshing: false,
        refreshResults: result.success ? result.data || [] : [],
      }))
    } catch (error) {
      setSubscriptions((prev) => ({ ...prev, isRefreshing: false, error: String(error) }))
    }
  }, [])

  // Сеттеры для использования из scheduler
  const setIsRefreshing = useCallback((value: boolean) => {
    setSubscriptions((prev) => ({ ...prev, isRefreshing: value }))
  }, [])

  const setRefreshResults = useCallback((results: SubscriptionRefreshResult[]) => {
    setSubscriptions((prev) => ({ ...prev, refreshResults: results, isRefreshing: false }))
  }, [])

  return {
    subscriptions,
    addSubscription,
    removeSubscription,
    updateSubscription,
    refreshSubscription,
    refreshAllSubscriptions,
    setIsRefreshing,
    setRefreshResults,
  }
}
