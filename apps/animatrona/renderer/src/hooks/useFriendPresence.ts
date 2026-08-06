/**
 * useFriendPresence — React хук для presence друзей
 *
 * Предоставляет реактивный доступ к онлайн-статусам друзей.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type { PresenceMessage, PresenceSettings, WatchingInfo } from '../../../shared/types/orbitdb'

export interface UseFriendPresenceReturn {
  /** Presence всех друзей (peerId → presence) */
  presence: Record<string, PresenceMessage>
  /** Список онлайн друзей */
  onlineFriends: string[]
  /** Проверить онлайн-статус друга */
  isFriendOnline: (peerId: string) => boolean
  /** Получить что смотрит друг */
  getFriendWatching: (peerId: string) => WatchingInfo | undefined
  /** Обновить настройки presence */
  updateSettings: (settings: Partial<PresenceSettings>) => Promise<boolean>
  /** Установить свой watching статус */
  setWatching: (watching: WatchingInfo | undefined) => Promise<boolean>
  /** Запустить presence сервис */
  start: () => Promise<boolean>
  /** Остановить presence сервис */
  stop: () => Promise<boolean>
}

export function useFriendPresence(): UseFriendPresenceReturn {
  const [presence, setPresence] = useState<Record<string, PresenceMessage>>({})

  // Получить список онлайн друзей
  const onlineFriends = Object.entries(presence)
    .filter(([_, p]) => p.status !== 'offline')
    .map(([peerId]) => peerId)

  // Проверить онлайн-статус
  const isFriendOnline = useCallback(
    (peerId: string): boolean => {
      const p = presence[peerId]
      return p !== undefined && p.status !== 'offline'
    },
    [presence],
  )

  // Получить что смотрит друг
  const getFriendWatching = useCallback(
    (peerId: string): WatchingInfo | undefined => {
      return presence[peerId]?.watching
    },
    [presence],
  )

  // Обновить настройки
  const updateSettings = useCallback(async (settings: Partial<PresenceSettings>): Promise<boolean> => {
    if (!window.electronAPI?.presence) {
      return false
    }

    try {
      const result = await window.electronAPI.presence.updateSettings(settings)
      return result.success
    } catch {
      return false
    }
  }, [])

  // Установить watching
  const setWatching = useCallback(async (watching: WatchingInfo | undefined): Promise<boolean> => {
    if (!window.electronAPI?.presence) {
      return false
    }

    try {
      const result = await window.electronAPI.presence.setWatching(watching)
      return result.success
    } catch {
      return false
    }
  }, [])

  // Запустить сервис
  const start = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.presence) {
      return false
    }

    try {
      const result = await window.electronAPI.presence.start()
      return result.success
    } catch {
      return false
    }
  }, [])

  // Остановить сервис
  const stop = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.presence) {
      return false
    }

    try {
      const result = await window.electronAPI.presence.stop()
      return result.success
    } catch {
      return false
    }
  }, [])

  // Загрузка всех presence при монтировании
  useEffect(() => {
    const loadPresence = async () => {
      if (!window.electronAPI?.presence) {
        return
      }

      const result = await window.electronAPI.presence.getAllPresence()
      if (result.success && result.data) {
        setPresence(result.data)
      }
    }

    loadPresence()

    // Подписки на события
    let unsubscribeUpdated: (() => void) | undefined
    let unsubscribeOnline: (() => void) | undefined
    let unsubscribeOffline: (() => void) | undefined

    if (window.electronAPI?.presence) {
      // Обновление presence
      unsubscribeUpdated = window.electronAPI.presence.onPresenceUpdated(({ peerId, presence: newPresence }) => {
        setPresence((prev) => ({ ...prev, [peerId]: newPresence }))
      })

      // Переход в онлайн (перезагрузить данные)
      unsubscribeOnline = window.electronAPI.presence.onFriendOnline(() => {
        loadPresence()
      })

      // Переход в оффлайн
      unsubscribeOffline = window.electronAPI.presence.onFriendOffline((peerId) => {
        setPresence((prev) => {
          const updated = { ...prev }
          if (updated[peerId]) {
            updated[peerId] = { ...updated[peerId], status: 'offline' }
          }
          return updated
        })
      })
    }

    return () => {
      unsubscribeUpdated?.()
      unsubscribeOnline?.()
      unsubscribeOffline?.()
    }
  }, [])

  return {
    presence,
    onlineFriends,
    isFriendOnline,
    getFriendWatching,
    updateSettings,
    setWatching,
    start,
    stop,
  }
}
