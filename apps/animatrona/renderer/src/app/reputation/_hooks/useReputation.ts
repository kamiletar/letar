'use client'

/**
 * Хуки для работы с репутацией, достижениями и бонусами
 */

import { useCallback, useEffect, useState } from 'react'

import type { AchievementWithProgress, UserAchievements } from '../../../../../shared/types/achievements'
import type { BonusPoints, BonusTransaction } from '../../../../../shared/types/bonus-points'
import type { UserReputation } from '../../../../../shared/types/reputation'
import type { UserStats } from '../../../../../shared/types/stats'

/**
 * Хук для получения статистики пользователя
 */
export function useStats() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      setError('API недоступен')
      setIsLoading(false)
      return
    }

    try {
      const result = await api.stats.get()
      if (result.success && result.data) {
        setStats(result.data)
        setError(null)
      } else {
        setError(result.error || 'Ошибка загрузки статистики')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    const api = window.electronAPI
    if (!api) {
      return
    }

    // Подписка на обновления
    const unsubscribe = api.stats.onUpdated(() => {
      fetchStats()
    })

    return () => unsubscribe()
  }, [fetchStats])

  return { stats, isLoading, error, refetch: fetchStats }
}

/**
 * Хук для получения репутации пользователя
 */
export function useReputation() {
  const [reputation, setReputation] = useState<UserReputation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReputation = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      setError('API недоступен')
      setIsLoading(false)
      return
    }

    try {
      const result = await api.reputation.get()
      if (result.success && result.data) {
        setReputation(result.data)
        setError(null)
      } else {
        setError(result.error || 'Ошибка загрузки репутации')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReputation()

    const api = window.electronAPI
    if (!api) {
      return
    }

    // Подписка на обновления
    const unsubscribe = api.reputation.onUpdated(() => {
      fetchReputation()
    })

    return () => unsubscribe()
  }, [fetchReputation])

  return { reputation, isLoading, error, refetch: fetchReputation }
}

/**
 * Хук для получения достижений пользователя
 */
export function useAchievements() {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([])
  const [userAchievements, setUserAchievements] = useState<UserAchievements | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAchievements = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      setError('API недоступен')
      setIsLoading(false)
      return
    }

    try {
      const [allResult, userResult] = await Promise.all([api.achievements.getAll(), api.achievements.get()])

      if (allResult.success && allResult.data) {
        setAchievements(allResult.data)
      }

      if (userResult.success && userResult.data) {
        setUserAchievements(userResult.data)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAchievements()

    const api = window.electronAPI
    if (!api) {
      return
    }

    // Подписка на разблокировку достижений
    const unsubUnlocked = api.achievements.onUnlocked(() => {
      fetchAchievements()
    })

    // Подписка на обновление прогресса
    const unsubProgress = api.achievements.onProgress(() => {
      fetchAchievements()
    })

    return () => {
      unsubUnlocked()
      unsubProgress()
    }
  }, [fetchAchievements])

  return { achievements, userAchievements, isLoading, error, refetch: fetchAchievements }
}

/**
 * Хук для получения бонусных очков
 */
export function useBonusPoints() {
  const [bonusPoints, setBonusPoints] = useState<BonusPoints | null>(null)
  const [transactions, setTransactions] = useState<BonusTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBonusPoints = useCallback(async () => {
    const api = window.electronAPI
    if (!api) {
      setError('API недоступен')
      setIsLoading(false)
      return
    }

    try {
      const [bonusResult, transResult] = await Promise.all([api.bonus.get(), api.bonus.getTransactions(20)])

      if (bonusResult.success && bonusResult.data) {
        setBonusPoints(bonusResult.data)
      }

      if (transResult.success && transResult.data) {
        setTransactions(transResult.data)
      }

      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBonusPoints()

    const api = window.electronAPI
    if (!api) {
      return
    }

    // Подписка на изменение баланса
    const unsubBalanceChanged = api.bonus.onBalanceChanged(() => {
      fetchBonusPoints()
    })

    return () => {
      unsubBalanceChanged()
    }
  }, [fetchBonusPoints])

  return { bonusPoints, transactions, isLoading, error, refetch: fetchBonusPoints }
}
