/**
 * Profile IPC handlers
 *
 * Handlers для работы с профилем пользователя и Friend Code.
 * Использует SQLite (UserProfileSync) + IPNS для синхронизации.
 */

import { getKuboService } from '../services/kubo'
import { getUserProfileSync } from '../services/sync'
import { generateFriendCode, isValidFriendCodeFormat, verifyFriendCode } from '../services/sync/friend-code'
import type { ProfileUpdate } from '../services/sync/user-profile-sync'
import { broadcastToWindows, createHandler } from '../utils/ipc-handler-factory'

/**
 * Регистрирует Profile IPC handlers
 */
export function registerProfileHandlers(): void {
  const userProfileSync = getUserProfileSync()

  // Получить профиль пользователя
  createHandler('profile:get', () => userProfileSync.getProfile())

  // Обновить профиль пользователя
  createHandler('profile:update', (updates: ProfileUpdate) => userProfileSync.updateProfile(updates))

  // Получить Friend Code текущего пользователя
  createHandler('friend-code:get', () => userProfileSync.getFriendCode())

  // Сгенерировать Friend Code из PeerId
  createHandler('friend-code:generate', (peerId: string) => generateFriendCode(peerId))

  // Верифицировать Friend Code
  createHandler('friend-code:verify', (code: string, peerId: string) => verifyFriendCode(code, peerId))

  // Проверить формат Friend Code
  createHandler('friend-code:validate-format', (code: string) => isValidFriendCodeFormat(code))

  // Получить PeerId текущего пользователя (через Kubo, не Helia)
  createHandler('profile:get-peer-id', () => getKuboService().getPeerId())

  // Опубликовать профиль через IPNS
  createHandler('profile:publish', () => userProfileSync.publishProfile())

  // Получить профиль друга по PeerId
  createHandler('profile:get-friend', (friendPeerId: string) => userProfileSync.getFriendProfile(friendPeerId))

  // Подписка на обновление профиля
  userProfileSync.on('profile:updated', (profile) => broadcastToWindows('profile:updated', profile))
}
