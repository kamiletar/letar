/**
 * Deep Link IPC handlers
 *
 * Handlers для работы с deep links и приглашениями.
 */

import { Notification } from 'electron'

import type { WatchPartyInvite } from '../../shared/types/orbitdb'
import { getDeepLinkService } from '../services/deep-link'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует Deep Link IPC handlers
 */
export function registerDeepLinkHandlers(): void {
  const deepLinkService = getDeepLinkService()

  // Подписаться на deep links
  createHandler('deep-link:subscribe', () => {
    deepLinkService.setCallback((action) => {
      broadcastToWindows('deep-link:received', action)
    })
  })

  // Отписаться от deep links
  createHandler('deep-link:unsubscribe', () => deepLinkService.removeCallback())

  // Сгенерировать invite для Watch Party
  createHandler(
    'deep-link:generateWatchPartyInvite',
    (roomId: string, roomName: string, hostName: string, animeName: string) =>
      deepLinkService.generateWatchPartyInvite(roomId, roomName, hostName, animeName),
  )

  // Сгенерировать link для добавления друга
  createHandler('deep-link:generateFriendLink', (friendCode: string) => deepLinkService.generateFriendLink(friendCode))

  // Показать уведомление о приглашении
  createHandler(
    'deep-link:showInviteNotification',
    (invite: WatchPartyInvite) => deepLinkService.showInviteNotification(invite),
  )

  // Проверить, поддерживаются ли уведомления
  createHandler('deep-link:notificationsSupported', () => Notification.isSupported())
}
