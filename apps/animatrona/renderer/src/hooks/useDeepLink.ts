/**
 * useDeepLink — React хук для Deep Links
 *
 * Предоставляет реактивный доступ к animatrona:// deep links.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'

import type { WatchPartyInvite } from '../../../shared/types/orbitdb'

/**
 * Тип действия из deep link
 */
export interface DeepLinkAction {
  type: 'import' | 'party_join' | 'friend_add' | 'unknown'
  data: Record<string, string>
}

export interface UseDeepLinkReturn {
  /** Последнее полученное действие */
  lastAction: DeepLinkAction | null
  /** Очистить последнее действие */
  clearAction: () => void
  /** Сгенерировать invite для Watch Party */
  generateWatchPartyInvite: (
    roomId: string,
    roomName: string,
    hostName: string,
    animeName: string,
  ) => Promise<WatchPartyInvite | null>
  /** Сгенерировать link для добавления друга */
  generateFriendLink: (friendCode: string) => Promise<string | null>
  /** Показать уведомление о приглашении */
  showInviteNotification: (invite: WatchPartyInvite) => Promise<boolean>
  /** Проверить, поддерживаются ли уведомления */
  notificationsSupported: () => Promise<boolean>
}

export function useDeepLink(): UseDeepLinkReturn {
  const [lastAction, setLastAction] = useState<DeepLinkAction | null>(null)

  // Очистить последнее действие
  const clearAction = useCallback(() => {
    setLastAction(null)
  }, [])

  // Сгенерировать invite для Watch Party
  const generateWatchPartyInvite = useCallback(
    async (roomId: string, roomName: string, hostName: string, animeName: string): Promise<WatchPartyInvite | null> => {
      if (!window.electronAPI?.deepLink) {
        return null
      }

      try {
        const result = await window.electronAPI.deepLink.generateWatchPartyInvite(roomId, roomName, hostName, animeName)
        return result.success ? (result.data ?? null) : null
      } catch {
        return null
      }
    },
    [],
  )

  // Сгенерировать link для добавления друга
  const generateFriendLink = useCallback(async (friendCode: string): Promise<string | null> => {
    if (!window.electronAPI?.deepLink) {
      return null
    }

    try {
      const result = await window.electronAPI.deepLink.generateFriendLink(friendCode)
      return result.success ? (result.data ?? null) : null
    } catch {
      return null
    }
  }, [])

  // Показать уведомление о приглашении
  const showInviteNotification = useCallback(async (invite: WatchPartyInvite): Promise<boolean> => {
    if (!window.electronAPI?.deepLink) {
      return false
    }

    try {
      const result = await window.electronAPI.deepLink.showInviteNotification(invite)
      return result.success
    } catch {
      return false
    }
  }, [])

  // Проверить поддержку уведомлений
  const notificationsSupported = useCallback(async (): Promise<boolean> => {
    if (!window.electronAPI?.deepLink) {
      return false
    }

    try {
      const result = await window.electronAPI.deepLink.notificationsSupported()
      return result.success ? (result.data ?? false) : false
    } catch {
      return false
    }
  }, [])

  // Подписка на deep links
  useEffect(() => {
    if (!window.electronAPI?.deepLink) {
      return
    }

    // Подписываемся на deep links
    window.electronAPI.deepLink.subscribe()

    // Слушаем входящие deep links
    const unsubscribe = window.electronAPI.deepLink.onReceived((action) => {
      setLastAction(action)
    })

    return () => {
      unsubscribe()
      window.electronAPI?.deepLink?.unsubscribe()
    }
  }, [])

  return {
    lastAction,
    clearAction,
    generateWatchPartyInvite,
    generateFriendLink,
    showInviteNotification,
    notificationsSupported,
  }
}
