'use client'

/**
 * useProfile — Хук для работы с профилем пользователя
 *
 * Обеспечивает:
 * - Получение и обновление профиля
 * - Работу с Friend Code
 * - Подписку на обновления в реальном времени
 */

import { useCallback, useEffect, useState } from 'react'

import type { UserProfile, UserProfileUpdate } from '../../../shared/types/orbitdb'

/**
 * Результат хука useProfile
 */
export interface UseProfileReturn {
  /** Профиль готов к использованию */
  isReady: boolean
  /** Идёт загрузка */
  isLoading: boolean
  /** Профиль пользователя */
  profile: UserProfile | null
  /** Последняя ошибка */
  error: string | null
  /** Обновить профиль */
  updateProfile: (updates: UserProfileUpdate) => Promise<boolean>
  /** Перезагрузить профиль */
  refreshProfile: () => Promise<void>
  /** Получить PeerId */
  getPeerId: () => Promise<string | null>
  /** Валидация Friend Code */
  validateFriendCode: (code: string) => Promise<boolean>
  /** Верификация Friend Code с PeerId */
  verifyFriendCode: (code: string, peerId: string) => Promise<boolean>
}

/**
 * Хук для работы с профилем пользователя
 */
export function useProfile(): UseProfileReturn {
  const [isReady, setIsReady] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Проверяем доступность API
  const api = typeof window !== 'undefined' ? window.electronAPI?.profile : undefined

  // Загрузка профиля
  const loadProfile = useCallback(async () => {
    if (!api) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await api.get()
      if (result.success && result.data) {
        setProfile(result.data)
        setIsReady(true)
      } else {
        setError(result.error || 'Не удалось загрузить профиль')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [api])

  // Инициализация
  useEffect(() => {
    loadProfile()

    // Подписываемся на обновления профиля
    if (!api) {
      return
    }

    const unsubscribe = api.onUpdated((updatedProfile: UserProfile) => {
      setProfile(updatedProfile)
    })

    return () => {
      unsubscribe()
    }
  }, [api, loadProfile])

  /**
   * Обновить профиль пользователя
   */
  const updateProfile = useCallback(
    async (updates: UserProfileUpdate): Promise<boolean> => {
      if (!api) {
        console.warn('[useProfile] API недоступен')
        return false
      }

      setError(null)

      try {
        const result = await api.update(updates)

        if (!result.success) {
          setError(result.error || 'Ошибка обновления профиля')
          return false
        }

        if (result.data) {
          setProfile(result.data)
        }

        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        return false
      }
    },
    [api]
  )

  /**
   * Перезагрузить профиль
   */
  const refreshProfile = useCallback(async (): Promise<void> => {
    await loadProfile()
  }, [loadProfile])

  /**
   * Получить PeerId
   */
  const getPeerId = useCallback(async (): Promise<string | null> => {
    if (!api) {
      console.warn('[useProfile] API недоступен')
      return null
    }

    try {
      const result = await api.getPeerId()
      if (result.success) {
        return result.data ?? null
      }
      setError(result.error || 'Ошибка получения PeerId')
      return null
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      return null
    }
  }, [api])

  /**
   * Валидация формата Friend Code
   */
  const validateFriendCode = useCallback(
    async (code: string): Promise<boolean> => {
      if (!api) {
        console.warn('[useProfile] API недоступен')
        return false
      }

      try {
        const result = await api.validateFriendCodeFormat(code)
        return result.success && result.data === true
      } catch {
        return false
      }
    },
    [api]
  )

  /**
   * Верификация Friend Code с PeerId
   */
  const verifyFriendCode = useCallback(
    async (code: string, peerId: string): Promise<boolean> => {
      if (!api) {
        console.warn('[useProfile] API недоступен')
        return false
      }

      try {
        const result = await api.verifyFriendCode(code, peerId)
        return result.success && result.data === true
      } catch {
        return false
      }
    },
    [api]
  )

  return {
    isReady,
    isLoading,
    profile,
    error,
    updateProfile,
    refreshProfile,
    getPeerId,
    validateFriendCode,
    verifyFriendCode,
  }
}
