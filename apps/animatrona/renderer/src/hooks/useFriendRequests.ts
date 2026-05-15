/**
 * useFriendRequests — React хук для работы с запросами в друзья
 *
 * Предоставляет реактивный доступ к входящим и исходящим запросам в друзья.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type { FriendRequest } from '../../../shared/types/orbitdb'

export interface UseFriendRequestsReturn {
  /** Входящие запросы в друзья */
  incomingRequests: FriendRequest[]
  /** Исходящие запросы в друзья */
  outgoingRequests: FriendRequest[]
  /** Данные загружаются */
  isLoading: boolean
  /** Ошибка загрузки */
  error: string | null
  /** Отправить запрос в друзья */
  sendRequest: (targetPeerId: string) => Promise<FriendRequest | null>
  /** Принять запрос */
  acceptRequest: (requestId: string) => Promise<boolean>
  /** Отклонить запрос */
  rejectRequest: (requestId: string) => Promise<boolean>
  /** Обновить списки запросов */
  refreshRequests: () => Promise<void>
}

export function useFriendRequests(): UseFriendRequestsReturn {
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Загрузка запросов
  const refreshRequests = useCallback(async () => {
    if (!window.electronAPI?.friends) {
      setError('Friends API недоступен')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const [incomingResult, outgoingResult] = await Promise.all([
        window.electronAPI.friends.getIncomingRequests(),
        window.electronAPI.friends.getOutgoingRequests(),
      ])

      if (incomingResult.success && incomingResult.data) {
        setIncomingRequests(incomingResult.data)
      }

      if (outgoingResult.success && outgoingResult.data) {
        setOutgoingRequests(outgoingResult.data)
      }

      if (!incomingResult.success || !outgoingResult.success) {
        setError(incomingResult.error || outgoingResult.error || 'Не удалось загрузить запросы')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Отправить запрос в друзья
  const sendRequest = useCallback(async (targetPeerId: string): Promise<FriendRequest | null> => {
    if (!window.electronAPI?.friends) {
      return null
    }

    try {
      const result = await window.electronAPI.friends.sendRequest(targetPeerId)
      if (result.success && result.data) {
        // Добавляем в исходящие
        setOutgoingRequests((prev) => [...prev, result.data!])
        return result.data
      }
      return null
    } catch {
      return null
    }
  }, [])

  // Принять запрос
  const acceptRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!window.electronAPI?.friends) {
      return false
    }

    try {
      const result = await window.electronAPI.friends.acceptRequest(requestId)
      if (result.success && result.data) {
        // Удаляем из входящих
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Отклонить запрос
  const rejectRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!window.electronAPI?.friends) {
      return false
    }

    try {
      const result = await window.electronAPI.friends.rejectRequest(requestId)
      if (result.success && result.data) {
        // Удаляем из входящих
        setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId))
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  // Загрузка при монтировании и подписка на обновления
  useEffect(() => {
    refreshRequests()

    // Подписываемся на события
    let unsubscribeReceived: (() => void) | undefined
    let unsubscribeUpdated: (() => void) | undefined

    if (window.electronAPI?.friends) {
      // Новый запрос
      unsubscribeReceived = window.electronAPI.friends.onRequestReceived((request) => {
        setIncomingRequests((prev) => [...prev, request])
      })

      // Обновление статуса запроса
      unsubscribeUpdated = window.electronAPI.friends.onRequestUpdated((request) => {
        // Обновляем в соответствующем списке
        setIncomingRequests((prev) =>
          prev.map((r) => (r.id === request.id ? request : r)).filter((r) => r.status === 'pending')
        )
        setOutgoingRequests((prev) =>
          prev.map((r) => (r.id === request.id ? request : r)).filter((r) => r.status === 'pending')
        )
      })
    }

    return () => {
      unsubscribeReceived?.()
      unsubscribeUpdated?.()
    }
  }, [refreshRequests])

  return {
    incomingRequests,
    outgoingRequests,
    isLoading,
    error,
    sendRequest,
    acceptRequest,
    rejectRequest,
    refreshRequests,
  }
}
