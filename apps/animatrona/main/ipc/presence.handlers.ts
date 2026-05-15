/**
 * Presence IPC handlers
 *
 * Handlers для онлайн-статусов и presence системы.
 * Использует Kubo PubSub для broadcast присутствия.
 */

import type { PresenceSettings, WatchingInfo } from '../../shared/types/orbitdb'
import { getPresenceSync } from '../services/sync'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует Presence IPC handlers
 */
export function registerPresenceHandlers(): void {
  const presenceSync = getPresenceSync()

  // === Управление сервисом ===
  createHandler('presence:start', () => presenceSync.start())
  createHandler('presence:stop', () => presenceSync.stop())

  // === Настройки ===
  createHandler('presence:updateSettings', (settings: Partial<PresenceSettings>) =>
    presenceSync.updateSettings(settings)
  )

  // === Watching ===
  createHandler('presence:setWatching', (watching: WatchingInfo | undefined) => presenceSync.setWatching(watching))

  // === Получение presence ===
  createHandler('presence:getFriendPresence', (peerId: string) => presenceSync.getFriendPresence(peerId) || null)

  createHandler('presence:getAllPresence', () => {
    const presenceMap = presenceSync.getAllPresence()
    const data: Record<string, unknown> = {}
    for (const [peerId, presence] of presenceMap) {
      data[peerId] = presence
    }
    return data
  })

  createHandler('presence:isFriendOnline', (peerId: string) => presenceSync.isFriendOnline(peerId))

  // === Подписки на события ===
  presenceSync.on('presence:updated', (peerId: string, presence) =>
    broadcastToWindows('presence:updated', { peerId, presence })
  )
  presenceSync.on('friend:online', (peerId: string) => broadcastToWindows('presence:friendOnline', peerId))
  presenceSync.on('friend:offline', (peerId: string) => broadcastToWindows('presence:friendOffline', peerId))
}
