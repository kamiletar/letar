/**
 * useFriends — React хук для работы со списком друзей
 *
 * Предоставляет реактивный доступ к списку друзей и операциям с ними.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type { Friend } from '../../../shared/types/orbitdb'

export interface UseFriendsReturn {
  /** Список друзей */
  friends: Friend[]
  /** Данные загружаются */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
  /** Удалить из друзей */
  removeFriend: (peerId: string) => Promise<boolean>
  /** Заблокировать пользователя */
  blockUser: (peerId: string) => Promise<boolean>
  /** Проверить блокировку */
  isBlocked: (peerId: string) => Promise<boolean>
  /** Обновить список друзей */
  refreshFriends: () => Promise<void>
}

export function useFriends(): UseFriendsReturn {
  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка списка друзей
  const refreshFriends = useCallback(async () => {
    if (!window.electronAPI?.friends) {
      setError('Friends API недоступен')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const result = await window.electronAPI.friends.list()

      if (result.success && result.data) {
        setFriends(result.data)
      } else {
        setError(result.error || 'Не удалось загрузить список друзей')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Удалить из друзей
  const removeFriend = useCallback(async (peerId: string): Promise<boolean> => {
    if (!window.electronAPI?.friends) {
      return false
    }

    try {
      const result = await window.electronAPI.friends.remove(peerId)
      return result.success && result.data === true
    } catch {
      return false
    }
  }, [])

  // Заблокировать пользователя
  const blockUser = useCallback(async (peerId: string): Promise<boolean> => {
    if (!window.electronAPI?.friends) {
      return false
    }

    try {
      const result = await window.electronAPI.friends.block(peerId)
      return result.success && result.data === true
    } catch {
      return false
    }
  }, [])

  // Проверить блокировку
  const isBlocked = useCallback(async (peerId: string): Promise<boolean> => {
    if (!window.electronAPI?.friends) {
      return false
    }

    try {
      const result = await window.electronAPI.friends.isBlocked(peerId)
      return result.success && result.data === true
    } catch {
      return false
    }
  }, [])

  // Загрузка при монтировании и подписка на обновления
  useEffect(() => {
    refreshFriends()

    // Подписываемся на обновления списка друзей
    let unsubscribe: (() => void) | undefined

    if (window.electronAPI?.friends) {
      unsubscribe = window.electronAPI.friends.onFriendsUpdated((updatedFriends) => {
        setFriends(updatedFriends)
      })
    }

    return () => {
      unsubscribe?.()
    }
  }, [refreshFriends])

  return {
    friends,
    isLoading,
    error,
    removeFriend,
    blockUser,
    isBlocked,
    refreshFriends,
  }
}
